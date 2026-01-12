use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
    pub research_items: Vec<ProjectResearchItem>,
    pub content_groups: Vec<ProjectContentGroup>,
    pub generated_images: Vec<ProjectGeneratedImageRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMeta {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
    pub research_count: usize,
    pub content_count: usize,
    pub image_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectResearchItem {
    pub id: String,
    pub prompt: String,
    pub title: String,
    pub summary: String,
    pub full_report: ProjectResearchReport,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectResearchReport {
    pub ingredient_analysis: Option<ProjectIngredientAnalysis>,
    pub papers: Vec<ProjectPaperResult>,
    pub sources: Vec<ProjectSourceReference>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIngredientAnalysis {
    pub ingredient_name: String,
    pub korean_name: String,
    pub ewg_score: Option<i32>,
    pub benefits: Vec<String>,
    pub cautions: Vec<String>,
    pub recommended_concentration: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectPaperResult {
    pub id: String,
    pub title: String,
    pub authors: Vec<String>,
    #[serde(rename = "abstract")]
    pub abstract_text: String,
    pub publication_date: String,
    pub source: String,
    pub citation_count: Option<i32>,
    pub doi: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSourceReference {
    pub id: String,
    pub title: String,
    pub url: String,
    #[serde(rename = "type")]
    pub source_type: String,
    pub cited_in: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectContentGroup {
    pub id: String,
    pub name: String,
    pub research_item_ids: Vec<String>,
    pub contents: Vec<ProjectContentItem>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectContentItem {
    pub id: String,
    pub title: String,
    pub character_name: String,
    pub journal_number: i32,
    pub content: String,
    pub image_concept: String,
    pub status: String,
    pub generated_image_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectGeneratedImageRecord {
    pub id: String,
    pub content_id: String,
    pub content_group_id: String,
    pub image_url: String,
    pub local_path: String,
    pub created_at: String,
}
