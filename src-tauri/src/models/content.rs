use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeywordSuggestion {
    pub id: String,
    pub keyword: String,
    pub trend: String, // "rising", "stable", "hot"
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaperResult {
    pub id: String,
    pub title: String,
    pub authors: Vec<String>,
    pub abstract_text: String,
    pub publication_date: String,
    pub source: String,
    pub citation_count: Option<u32>,
    pub doi: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IngredientAnalysis {
    pub ingredient_name: String,
    pub korean_name: String,
    pub ewg_score: Option<u8>,
    pub benefits: Vec<String>,
    pub cautions: Vec<String>,
    pub recommended_concentration: Option<String>,
    pub related_papers: Vec<PaperResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentPlanItem {
    pub id: String,
    pub title: String,
    pub character_name: String,
    pub journal_number: u32,
    pub content: String,
    pub image_concept: String,
    pub status: String, // "pending", "generating", "completed", "error"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterPersona {
    pub name: String,
    pub description: String,
    pub personality_traits: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedImage {
    pub id: String,
    pub content_id: String,
    pub url: String,
    pub local_path: Option<String>,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentGenerationRequest {
    pub keyword: String,
    pub prompt_id: String,
    pub count: u32,
    pub api_key: Option<String>,
    pub llm_provider: Option<String>,
    pub research_data: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenerationRequest {
    pub content_id: String,
    pub image_concept: String,
    pub style_prompt: String,
    pub style_image_path: Option<String>,
}
