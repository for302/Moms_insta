use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppSettings {
    pub api_keys: ApiKeys,
    pub api_selection: ApiSelection,
    pub image_prompts: Vec<ImagePrompt>,
    pub content_prompts: Vec<ContentPrompt>,
    pub save_path: String,
    #[serde(default)]
    pub layout_settings: LayoutSettings,
    #[serde(default)]
    pub image_size_presets: Vec<ImageSizePreset>,
}

// 이미지 크기 프리셋
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageSizePreset {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
}

impl Default for ImageSizePreset {
    fn default() -> Self {
        Self {
            id: "instagram".to_string(),
            name: "인스타그램 게시물".to_string(),
            width: 1080,
            height: 1350,
        }
    }
}

// 레이아웃 요소
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutElement {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub element_type: String, // "text" or "image"
    pub prompt: String,
    pub color: String,
    pub x: f32,      // 0-100 (%)
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

// 레이아웃 설정
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutSettings {
    pub selected_preset_id: String,
    pub elements: Vec<LayoutElement>,
}

impl Default for LayoutSettings {
    fn default() -> Self {
        Self {
            selected_preset_id: "instagram".to_string(),
            elements: vec![
                LayoutElement {
                    id: "title".to_string(),
                    name: "제목".to_string(),
                    enabled: true,
                    element_type: "text".to_string(),
                    prompt: String::new(),
                    color: "#EF4444".to_string(), // 빨강
                    x: 5.0,
                    y: 5.0,
                    width: 50.0,
                    height: 10.0,
                },
                LayoutElement {
                    id: "subtitle".to_string(),
                    name: "부제".to_string(),
                    enabled: true,
                    element_type: "text".to_string(),
                    prompt: String::new(),
                    color: "#EC4899".to_string(), // 분홍
                    x: 5.0,
                    y: 17.0,
                    width: 50.0,
                    height: 8.0,
                },
                LayoutElement {
                    id: "short_knowledge".to_string(),
                    name: "짧은지식".to_string(),
                    enabled: true,
                    element_type: "text".to_string(),
                    prompt: String::new(),
                    color: "#3B82F6".to_string(), // 파랑
                    x: 5.0,
                    y: 75.0,
                    width: 45.0,
                    height: 20.0,
                },
                LayoutElement {
                    id: "hero_image".to_string(),
                    name: "히어로 이미지".to_string(),
                    enabled: true,
                    element_type: "image".to_string(),
                    prompt: String::new(),
                    color: "#F59E0B".to_string(), // 노랑
                    x: 50.0,
                    y: 25.0,
                    width: 45.0,
                    height: 50.0,
                },
                LayoutElement {
                    id: "background".to_string(),
                    name: "배경 이미지".to_string(),
                    enabled: true,
                    element_type: "image".to_string(),
                    prompt: String::new(),
                    color: "#9CA3AF".to_string(), // 회색
                    x: 0.0,
                    y: 0.0,
                    width: 100.0,
                    height: 100.0,
                },
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ApiKeys {
    pub google: Option<String>,
    pub openai: Option<String>,
    pub anthropic: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiSelection {
    pub content_generation: String, // "openai", "anthropic", "google"
    pub image_generation: String,   // "openai", "google"
}

impl Default for ApiSelection {
    fn default() -> Self {
        Self {
            content_generation: "anthropic".to_string(),
            image_generation: "google".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImagePrompt {
    pub id: String,
    pub name: String,
    pub prompt: String,
    pub style_image_path: Option<String>,
    #[serde(default)]
    pub preview_image_path: Option<String>,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentPrompt {
    pub id: String,
    pub name: String,
    pub prompt: String,
    pub is_default: bool,
}
