use reqwest::Client;
use serde::{Deserialize, Serialize};
use quick_xml::de::from_str;

pub struct NewsService {
    client: Client,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewsResult {
    pub title: String,
    pub description: String,
    pub link: String,
    pub pub_date: String,
    pub source: String,
}

// RSS Feed structures
#[derive(Debug, Deserialize)]
struct RssFeed {
    channel: RssChannel,
}

#[derive(Debug, Deserialize)]
struct RssChannel {
    #[serde(default)]
    item: Vec<RssItem>,
}

#[derive(Debug, Deserialize)]
struct RssItem {
    title: Option<String>,
    description: Option<String>,
    link: Option<String>,
    #[serde(rename = "pubDate")]
    pub_date: Option<String>,
}

impl NewsService {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    /// Search Yonhap News RSS feed
    pub async fn search_yonhap(&self, keyword: &str) -> Result<Vec<NewsResult>, String> {
        // 연합뉴스 주요 RSS 피드들
        let feeds = vec![
            "https://www.yna.co.kr/rss/news.xml",           // 전체 뉴스
            "https://www.yna.co.kr/rss/economy.xml",        // 경제
            "https://www.yna.co.kr/rss/science.xml",        // 과학
        ];

        let mut all_results = Vec::new();

        for feed_url in feeds {
            match self.fetch_and_parse_rss(feed_url, keyword, "연합뉴스").await {
                Ok(results) => all_results.extend(results),
                Err(e) => eprintln!("연합뉴스 RSS 파싱 실패 ({}): {}", feed_url, e),
            }
        }

        // Remove duplicates based on title
        all_results.sort_by(|a, b| a.title.cmp(&b.title));
        all_results.dedup_by(|a, b| a.title == b.title);

        Ok(all_results)
    }

    /// Search CNN RSS feed
    pub async fn search_cnn(&self, keyword: &str) -> Result<Vec<NewsResult>, String> {
        let feeds = vec![
            "http://rss.cnn.com/rss/edition.rss",           // Top Stories
            "http://rss.cnn.com/rss/edition_world.rss",     // World
            "http://rss.cnn.com/rss/edition_technology.rss", // Technology
        ];

        let mut all_results = Vec::new();

        for feed_url in feeds {
            match self.fetch_and_parse_rss(feed_url, keyword, "CNN").await {
                Ok(results) => all_results.extend(results),
                Err(e) => eprintln!("CNN RSS 파싱 실패 ({}): {}", feed_url, e),
            }
        }

        // Remove duplicates
        all_results.sort_by(|a, b| a.title.cmp(&b.title));
        all_results.dedup_by(|a, b| a.title == b.title);

        Ok(all_results)
    }

    /// Search all news sources
    pub async fn search_all(&self, keyword: &str) -> Result<Vec<NewsResult>, String> {
        let (yonhap_results, cnn_results) = tokio::join!(
            self.search_yonhap(keyword),
            self.search_cnn(keyword)
        );

        let mut all_results = Vec::new();

        if let Ok(results) = yonhap_results {
            all_results.extend(results);
        }

        if let Ok(results) = cnn_results {
            all_results.extend(results);
        }

        Ok(all_results)
    }

    /// Fetch and parse RSS feed, filtering by keyword
    async fn fetch_and_parse_rss(
        &self,
        url: &str,
        keyword: &str,
        source: &str,
    ) -> Result<Vec<NewsResult>, String> {
        let response = self
            .client
            .get(url)
            .header("User-Agent", "MomsInsta/1.0")
            .send()
            .await
            .map_err(|e| format!("RSS 요청 실패: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("RSS 요청 실패: HTTP {}", response.status()));
        }

        let xml_content = response
            .text()
            .await
            .map_err(|e| format!("RSS 응답 읽기 실패: {}", e))?;

        let feed: RssFeed = from_str(&xml_content)
            .map_err(|e| format!("RSS 파싱 실패: {}", e))?;

        let keyword_lower = keyword.to_lowercase();

        let results: Vec<NewsResult> = feed.channel.item
            .into_iter()
            .filter(|item| {
                let title = item.title.as_deref().unwrap_or("").to_lowercase();
                let desc = item.description.as_deref().unwrap_or("").to_lowercase();
                title.contains(&keyword_lower) || desc.contains(&keyword_lower)
            })
            .map(|item| NewsResult {
                title: item.title.unwrap_or_else(|| "제목 없음".to_string()),
                description: clean_html(&item.description.unwrap_or_default()),
                link: item.link.unwrap_or_default(),
                pub_date: item.pub_date.unwrap_or_else(|| "Unknown".to_string()),
                source: source.to_string(),
            })
            .take(10) // Limit results per feed
            .collect();

        Ok(results)
    }
}

/// Remove HTML tags from text
fn clean_html(text: &str) -> String {
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

    // Decode common HTML entities
    result
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
        .trim()
        .to_string()
}
