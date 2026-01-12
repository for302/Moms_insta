use reqwest::Client;
use serde::{Deserialize, Serialize};

pub struct CrossRefService {
    client: Client,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConferenceResult {
    pub id: String,
    pub title: String,
    pub authors: Vec<String>,
    pub published_date: String,
    pub source: String,
    pub doi: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CrossRefResponse {
    message: CrossRefMessage,
}

#[derive(Debug, Deserialize)]
struct CrossRefMessage {
    items: Option<Vec<CrossRefItem>>,
}

#[derive(Debug, Deserialize)]
struct CrossRefItem {
    #[serde(rename = "DOI")]
    doi: Option<String>,
    title: Option<Vec<String>>,
    author: Option<Vec<CrossRefAuthor>>,
    #[serde(rename = "container-title")]
    container_title: Option<Vec<String>>,
    published: Option<CrossRefDate>,
    #[serde(rename = "URL")]
    url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CrossRefAuthor {
    given: Option<String>,
    family: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CrossRefDate {
    #[serde(rename = "date-parts")]
    date_parts: Option<Vec<Vec<i32>>>,
}

impl CrossRefService {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    /// Search CrossRef for academic papers and conference proceedings
    pub async fn search(&self, query: &str, limit: usize) -> Result<Vec<ConferenceResult>, String> {
        let url = format!(
            "https://api.crossref.org/works?query={}&rows={}&select=DOI,title,author,container-title,published,URL",
            urlencoding::encode(query),
            limit
        );

        let response = self
            .client
            .get(&url)
            .header("User-Agent", "MomsInsta/1.0 (mailto:contact@example.com)")
            .send()
            .await
            .map_err(|e| format!("CrossRef API 요청 실패: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("CrossRef API 오류: {}", error_text));
        }

        let result: CrossRefResponse = response
            .json()
            .await
            .map_err(|e| format!("응답 파싱 실패: {}", e))?;

        let items = result.message.items.unwrap_or_default();

        let results: Vec<ConferenceResult> = items
            .into_iter()
            .map(|item| {
                let title = item.title
                    .and_then(|t| t.first().cloned())
                    .unwrap_or_else(|| "제목 없음".to_string());

                let authors: Vec<String> = item.author
                    .unwrap_or_default()
                    .into_iter()
                    .map(|a| {
                        let given = a.given.unwrap_or_default();
                        let family = a.family.unwrap_or_default();
                        if given.is_empty() {
                            family
                        } else {
                            format!("{} {}", given, family)
                        }
                    })
                    .collect();

                let source = item.container_title
                    .and_then(|c| c.first().cloned())
                    .unwrap_or_else(|| "Unknown".to_string());

                let published_date = item.published
                    .and_then(|p| p.date_parts)
                    .and_then(|dp| dp.first().cloned())
                    .map(|parts| {
                        parts.iter()
                            .map(|n| n.to_string())
                            .collect::<Vec<_>>()
                            .join("-")
                    })
                    .unwrap_or_else(|| "Unknown".to_string());

                let doi = item.doi.clone();
                let url = item.url.or_else(|| {
                    item.doi.as_ref().map(|d| format!("https://doi.org/{}", d))
                });

                ConferenceResult {
                    id: doi.clone().unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
                    title,
                    authors,
                    published_date,
                    source,
                    doi,
                    url,
                }
            })
            .collect();

        Ok(results)
    }
}
