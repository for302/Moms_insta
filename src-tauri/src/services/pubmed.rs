use reqwest::Client;
use serde::Deserialize;

pub struct PubMedService {
    client: Client,
    base_url: String,
}

#[derive(Debug, Deserialize)]
struct ESearchResult {
    esearchresult: ESearchData,
}

#[derive(Debug, Deserialize)]
struct ESearchData {
    #[serde(default)]
    idlist: Vec<String>,
    count: Option<String>,
}

#[derive(Debug, Deserialize)]
struct EFetchResult {
    #[serde(rename = "PubmedArticle", default)]
    articles: Vec<PubmedArticle>,
}

#[derive(Debug, Deserialize)]
struct PubmedArticle {
    #[serde(rename = "MedlineCitation")]
    medline_citation: MedlineCitation,
}

#[derive(Debug, Deserialize)]
struct MedlineCitation {
    #[serde(rename = "PMID")]
    pmid: PmidElement,
    #[serde(rename = "Article")]
    article: Article,
}

#[derive(Debug, Deserialize)]
struct PmidElement {
    #[serde(rename = "$value", default)]
    value: String,
}

#[derive(Debug, Deserialize)]
struct Article {
    #[serde(rename = "ArticleTitle")]
    title: Option<String>,
    #[serde(rename = "Abstract")]
    article_abstract: Option<AbstractText>,
    #[serde(rename = "AuthorList")]
    author_list: Option<AuthorList>,
    #[serde(rename = "Journal")]
    journal: Option<Journal>,
}

#[derive(Debug, Deserialize)]
struct AbstractText {
    #[serde(rename = "AbstractText")]
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AuthorList {
    #[serde(rename = "Author", default)]
    authors: Vec<Author>,
}

#[derive(Debug, Deserialize)]
struct Author {
    #[serde(rename = "LastName")]
    last_name: Option<String>,
    #[serde(rename = "ForeName")]
    fore_name: Option<String>,
    #[serde(rename = "Initials")]
    initials: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Journal {
    #[serde(rename = "JournalIssue")]
    journal_issue: Option<JournalIssue>,
}

#[derive(Debug, Deserialize)]
struct JournalIssue {
    #[serde(rename = "PubDate")]
    pub_date: Option<PubDate>,
}

#[derive(Debug, Deserialize)]
struct PubDate {
    #[serde(rename = "Year")]
    year: Option<String>,
}

#[derive(Debug, Clone)]
pub struct PaperInfo {
    pub pmid: String,
    pub title: String,
    pub authors: Vec<String>,
    pub abstract_text: String,
    pub year: String,
}

impl PubMedService {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            base_url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils".to_string(),
        }
    }

    /// Search PubMed for articles matching the query
    pub async fn search(&self, query: &str, limit: u32) -> Result<Vec<PaperInfo>, String> {
        // Step 1: Search for IDs
        let search_url = format!(
            "{}/esearch.fcgi?db=pubmed&term={}&retmax={}&retmode=json&sort=relevance",
            self.base_url,
            urlencoding::encode(query),
            limit
        );

        let search_response = self
            .client
            .get(&search_url)
            .send()
            .await
            .map_err(|e| format!("PubMed 검색 요청 실패: {}", e))?;

        if !search_response.status().is_success() {
            return Err("PubMed 검색 API 오류".to_string());
        }

        let search_result: ESearchResult = search_response
            .json()
            .await
            .map_err(|e| format!("검색 응답 파싱 실패: {}", e))?;

        let ids = search_result.esearchresult.idlist;
        if ids.is_empty() {
            return Ok(vec![]);
        }

        // Step 2: Fetch article details
        let fetch_url = format!(
            "{}/efetch.fcgi?db=pubmed&id={}&retmode=xml",
            self.base_url,
            ids.join(",")
        );

        let fetch_response = self
            .client
            .get(&fetch_url)
            .send()
            .await
            .map_err(|e| format!("PubMed fetch 요청 실패: {}", e))?;

        if !fetch_response.status().is_success() {
            return Err("PubMed fetch API 오류".to_string());
        }

        let xml_text = fetch_response
            .text()
            .await
            .map_err(|e| format!("응답 텍스트 읽기 실패: {}", e))?;

        // Parse XML and extract paper info
        let papers = self.parse_pubmed_xml(&xml_text)?;
        Ok(papers)
    }

    /// Parse PubMed XML response
    fn parse_pubmed_xml(&self, xml: &str) -> Result<Vec<PaperInfo>, String> {
        let mut papers = Vec::new();

        // Simple XML parsing using string manipulation for reliability
        let articles: Vec<&str> = xml.split("<PubmedArticle>").skip(1).collect();

        for article_xml in articles {
            let pmid = self.extract_tag_content(article_xml, "PMID").unwrap_or_default();
            let title = self
                .extract_tag_content(article_xml, "ArticleTitle")
                .unwrap_or_else(|| "제목 없음".to_string());
            let abstract_text = self
                .extract_tag_content(article_xml, "AbstractText")
                .unwrap_or_else(|| "초록 없음".to_string());
            let year = self
                .extract_tag_content(article_xml, "Year")
                .unwrap_or_else(|| "연도 미상".to_string());

            // Extract authors
            let authors = self.extract_authors(article_xml);

            papers.push(PaperInfo {
                pmid,
                title,
                authors,
                abstract_text,
                year,
            });
        }

        Ok(papers)
    }

    fn extract_tag_content(&self, xml: &str, tag: &str) -> Option<String> {
        let start_tag = format!("<{}", tag);
        let end_tag = format!("</{}>", tag);

        let start = xml.find(&start_tag)?;
        let after_start = &xml[start..];
        let content_start = after_start.find('>')? + 1;
        let content = &after_start[content_start..];
        let end = content.find(&end_tag)?;

        let text = &content[..end];
        // Remove any nested XML tags
        let clean_text = self.strip_tags(text);
        Some(clean_text.trim().to_string())
    }

    fn strip_tags(&self, text: &str) -> String {
        let mut result = String::new();
        let mut in_tag = false;

        for c in text.chars() {
            match c {
                '<' => in_tag = true,
                '>' => in_tag = false,
                _ if !in_tag => result.push(c),
                _ => {}
            }
        }

        result
    }

    fn extract_authors(&self, xml: &str) -> Vec<String> {
        let mut authors = Vec::new();

        // Find all Author elements
        for author_part in xml.split("<Author").skip(1) {
            if let Some(end_idx) = author_part.find("</Author>") {
                let author_xml = &author_part[..end_idx];
                let last_name = self
                    .extract_tag_content(author_xml, "LastName")
                    .unwrap_or_default();
                let initials = self
                    .extract_tag_content(author_xml, "Initials")
                    .unwrap_or_default();

                if !last_name.is_empty() {
                    authors.push(format!("{} {}", last_name, initials));
                }
            }
        }

        authors
    }

    /// Search for cosmetic/skincare ingredient related papers
    pub async fn search_ingredient(&self, ingredient: &str, limit: u32) -> Result<Vec<PaperInfo>, String> {
        let query = format!(
            "({} OR {} cosmetic OR {} skin OR {} skincare) AND (safety OR efficacy OR benefit)",
            ingredient, ingredient, ingredient, ingredient
        );
        self.search(&query, limit).await
    }
}

impl Default for PubMedService {
    fn default() -> Self {
        Self::new()
    }
}
