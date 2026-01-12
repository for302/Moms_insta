use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

pub struct GoogleService {
    client: Client,
    api_key: String,
}

// Gemini API Request/Response types
#[derive(Debug, Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(rename = "generationConfig", skip_serializing_if = "Option::is_none")]
    generation_config: Option<GenerationConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
    #[serde(skip_serializing_if = "Option::is_none")]
    role: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiPart {
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
    #[serde(rename = "inlineData", skip_serializing_if = "Option::is_none")]
    inline_data: Option<InlineData>,
}

#[derive(Debug, Serialize, Deserialize)]
struct InlineData {
    #[serde(rename = "mimeType")]
    mime_type: String,
    data: String,
}

#[derive(Debug, Serialize)]
struct GenerationConfig {
    temperature: f32,
    #[serde(rename = "maxOutputTokens")]
    max_output_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Vec<Candidate>,
}

#[derive(Debug, Deserialize)]
struct Candidate {
    content: GeminiContent,
}

// Image generation request for Gemini Imagen
#[derive(Debug, Serialize)]
struct ImagenRequest {
    instances: Vec<ImagenInstance>,
    parameters: ImagenParameters,
}

#[derive(Debug, Serialize)]
struct ImagenInstance {
    prompt: String,
}

#[derive(Debug, Serialize)]
struct ImagenParameters {
    #[serde(rename = "sampleCount")]
    sample_count: u32,
    #[serde(rename = "aspectRatio")]
    aspect_ratio: String,
    #[serde(rename = "negativePrompt", skip_serializing_if = "Option::is_none")]
    negative_prompt: Option<String>,
}

// Gemini native image generation response (gemini-2.0-flash with image output)
#[derive(Debug, Deserialize)]
struct GeminiImageResponse {
    candidates: Option<Vec<GeminiImageCandidate>>,
    error: Option<GeminiError>,
}

#[derive(Debug, Deserialize)]
struct GeminiImageCandidate {
    content: GeminiImageContent,
}

#[derive(Debug, Deserialize)]
struct GeminiImageContent {
    parts: Vec<GeminiImagePart>,
}

#[derive(Debug, Deserialize)]
struct GeminiImagePart {
    text: Option<String>,
    #[serde(rename = "inlineData")]
    inline_data: Option<GeminiInlineData>,
}

#[derive(Debug, Deserialize)]
struct GeminiInlineData {
    #[serde(rename = "mimeType")]
    mime_type: String,
    data: String,
}

#[derive(Debug, Deserialize)]
struct GeminiError {
    code: Option<i32>,
    message: Option<String>,
    status: Option<String>,
}

// Legacy Imagen API response structures (fallback)
#[derive(Debug, Deserialize)]
struct ImagenResponse {
    #[serde(rename = "generatedImages")]
    generated_images: Option<Vec<GeneratedImageData>>,
    predictions: Option<Vec<ImagenPrediction>>,
}

#[derive(Debug, Deserialize)]
struct GeneratedImageData {
    image: ImageBytes,
}

#[derive(Debug, Deserialize)]
struct ImageBytes {
    #[serde(rename = "imageBytes")]
    image_bytes: String,
}

#[derive(Debug, Deserialize)]
struct ImagenPrediction {
    #[serde(rename = "bytesBase64Encoded")]
    bytes_base64_encoded: Option<String>,
}

impl GoogleService {
    pub fn new(api_key: &str) -> Self {
        Self {
            client: Client::new(),
            api_key: api_key.to_string(),
        }
    }

    /// Generate text using Gemini API
    pub async fn generate_text(
        &self,
        prompt: &str,
        system_prompt: Option<&str>,
    ) -> Result<String, String> {
        let mut contents = vec![];

        // Add system instruction if provided
        if let Some(sys) = system_prompt {
            contents.push(GeminiContent {
                parts: vec![GeminiPart {
                    text: Some(sys.to_string()),
                    inline_data: None,
                }],
                role: Some("user".to_string()),
            });
            contents.push(GeminiContent {
                parts: vec![GeminiPart {
                    text: Some("알겠습니다. 지침을 따르겠습니다.".to_string()),
                    inline_data: None,
                }],
                role: Some("model".to_string()),
            });
        }

        contents.push(GeminiContent {
            parts: vec![GeminiPart {
                text: Some(prompt.to_string()),
                inline_data: None,
            }],
            role: Some("user".to_string()),
        });

        let request = GeminiRequest {
            contents,
            generation_config: Some(GenerationConfig {
                temperature: 0.7,
                max_output_tokens: 4096,
            }),
        };

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
            self.api_key
        );

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Gemini API 요청 실패: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Gemini API 오류: {}", error_text));
        }

        let result: GeminiResponse = response
            .json()
            .await
            .map_err(|e| format!("응답 파싱 실패: {}", e))?;

        result
            .candidates
            .first()
            .and_then(|c| c.content.parts.first())
            .and_then(|p| p.text.clone())
            .ok_or_else(|| "응답이 비어있습니다".to_string())
    }

    /// Generate image using Gemini API
    /// Tries multiple approaches: 1) Gemini 2.0 native image generation, 2) Imagen 3 API
    pub async fn generate_image(
        &self,
        prompt: &str,
        aspect_ratio: &str,
    ) -> Result<String, String> {
        // Default to Imagen 4 Standard
        self.generate_image_with_model(prompt, aspect_ratio, "imagen-4.0-generate-001", None).await
    }

    /// Generate image using specified model
    pub async fn generate_image_with_model(
        &self,
        prompt: &str,
        aspect_ratio: &str,
        model: &str,
        negative_prompt: Option<&str>,
    ) -> Result<String, String> {
        println!("Using Google image model: {}", model);
        println!("Aspect ratio: {}", aspect_ratio);
        if let Some(neg) = negative_prompt {
            println!("Negative prompt: {}", neg);
        }

        match model {
            // Imagen 4 시리즈 (공식 API)
            "imagen-4.0-generate-001" => {
                println!("Using Imagen 4 Standard...");
                self.generate_image_with_imagen(prompt, aspect_ratio, model, negative_prompt).await
            }
            "imagen-4.0-ultra-generate-001" => {
                println!("Using Imagen 4 Ultra...");
                self.generate_image_with_imagen(prompt, aspect_ratio, model, negative_prompt).await
            }
            "imagen-4.0-fast-generate-001" => {
                println!("Using Imagen 4 Fast...");
                self.generate_image_with_imagen(prompt, aspect_ratio, model, negative_prompt).await
            }
            // Imagen 3
            "imagen-3.0-generate-002" => {
                println!("Using Imagen 3...");
                self.generate_image_with_imagen(prompt, aspect_ratio, model, negative_prompt).await
            }
            // 레거시 Gemini 모델
            "gemini-2.0-flash-exp" => {
                println!("Using Gemini 2.0 Flash (레거시)...");
                self.generate_image_with_gemini_native(prompt).await
            }
            // 레거시 모델 호환성 (마이그레이션용)
            "gemini-3-pro-image-preview" | "gemini-2.5-flash-preview-05-20" => {
                println!("Legacy model '{}' -> redirecting to Imagen 4 Standard...", model);
                self.generate_image_with_imagen(prompt, aspect_ratio, "imagen-4.0-generate-001", negative_prompt).await
            }
            _ => {
                // 기본값: Imagen 4 Standard
                println!("Unknown model '{}', using Imagen 4 Standard...", model);
                self.generate_image_with_imagen(prompt, aspect_ratio, "imagen-4.0-generate-001", negative_prompt).await
            }
        }
    }

    /// Generate image using specified Gemini model (Nano Banana / Nano Banana Pro)
    async fn generate_image_with_gemini_model(&self, prompt: &str, model_name: &str) -> Result<String, String> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model_name,
            self.api_key
        );

        let enhanced_prompt = format!(
            "Generate a high-quality illustration image based on this description: {}. \
            Create a cute, kawaii-style illustration with soft pastel colors, suitable for Instagram content.",
            prompt
        );

        let request_body = json!({
            "contents": [{
                "parts": [{
                    "text": enhanced_prompt
                }]
            }],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"]
            }
        });

        println!("Gemini Model API URL: {}", url);

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("{} API 요청 실패: {}", model_name, e))?;

        let status = response.status();
        let response_text = response.text().await.unwrap_or_default();

        println!("{} API Status: {}", model_name, status);
        println!("{} API Response (first 500 chars): {}", model_name, &response_text[..response_text.len().min(500)]);

        if !status.is_success() {
            return Err(format!("{} API 오류 ({}): {}", model_name, status, response_text));
        }

        let result: GeminiImageResponse = serde_json::from_str(&response_text)
            .map_err(|e| format!("응답 파싱 실패: {}", e))?;

        // Check for error in response
        if let Some(error) = result.error {
            return Err(format!(
                "{} 에러: {} ({})",
                model_name,
                error.message.unwrap_or_default(),
                error.status.unwrap_or_default()
            ));
        }

        // Extract image from response
        result
            .candidates
            .and_then(|candidates| candidates.into_iter().next())
            .and_then(|candidate| {
                candidate.content.parts.into_iter().find_map(|part| {
                    part.inline_data.map(|data| {
                        format!("data:{};base64,{}", data.mime_type, data.data)
                    })
                })
            })
            .ok_or_else(|| format!("{} 응답에 이미지가 없습니다.", model_name))
    }

    /// Generate image using Gemini 2.0 Flash's native image output capability
    async fn generate_image_with_gemini_native(&self, prompt: &str) -> Result<String, String> {
        // Use gemini-2.0-flash-exp for image generation
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={}",
            self.api_key
        );

        let enhanced_prompt = format!(
            "Generate a high-quality illustration image based on this description: {}. \
            Create a cute, kawaii-style illustration with soft pastel colors, suitable for Instagram content.",
            prompt
        );

        let request_body = json!({
            "contents": [{
                "parts": [{
                    "text": enhanced_prompt
                }]
            }],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"]
            }
        });

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Gemini 이미지 API 요청 실패: {}", e))?;

        let status = response.status();
        let response_text = response.text().await.unwrap_or_default();

        println!("Gemini Image API Status: {}", status);
        println!("Gemini Image API Response (first 500 chars): {}", &response_text[..response_text.len().min(500)]);

        if !status.is_success() {
            return Err(format!("Gemini 이미지 API 오류 ({}): {}", status, response_text));
        }

        let result: GeminiImageResponse = serde_json::from_str(&response_text)
            .map_err(|e| format!("응답 파싱 실패: {}", e))?;

        // Check for error in response
        if let Some(error) = result.error {
            return Err(format!(
                "Gemini API 에러: {} ({})",
                error.message.unwrap_or_default(),
                error.status.unwrap_or_default()
            ));
        }

        // Extract image from response
        result
            .candidates
            .and_then(|candidates| candidates.into_iter().next())
            .and_then(|candidate| {
                candidate.content.parts.into_iter().find_map(|part| {
                    part.inline_data.map(|data| {
                        format!("data:{};base64,{}", data.mime_type, data.data)
                    })
                })
            })
            .ok_or_else(|| "Gemini 응답에 이미지가 없습니다. 다른 방법을 시도합니다.".to_string())
    }

    /// Generate image using official Google Imagen API (Imagen 3/4)
    /// Reference: https://ai.google.dev/gemini-api/docs/imagen
    async fn generate_image_with_imagen(
        &self,
        prompt: &str,
        aspect_ratio: &str,
        model_name: &str,
        negative_prompt: Option<&str>,
    ) -> Result<String, String> {
        // Official Imagen API endpoint
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:predict?key={}",
            model_name,
            self.api_key
        );

        // Build request body following official API structure
        let mut parameters = json!({
            "sampleCount": 1,
            "aspectRatio": aspect_ratio
        });

        // Add negative prompt if provided
        if let Some(neg) = negative_prompt {
            if !neg.is_empty() {
                parameters["negativePrompt"] = json!(neg);
            }
        }

        let request_body = json!({
            "instances": [{
                "prompt": prompt
            }],
            "parameters": parameters
        });

        println!("Imagen API URL: {}", url);
        println!("Imagen API Request: {}", serde_json::to_string_pretty(&request_body).unwrap_or_default());

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Imagen API 요청 실패: {}", e))?;

        let status = response.status();
        let response_text = response.text().await.unwrap_or_default();

        println!("Imagen API Status: {}", status);
        println!("Imagen API Response (first 500 chars): {}", &response_text[..response_text.len().min(500)]);

        if !status.is_success() {
            // Parse error for better user-friendly message
            if response_text.contains("not found") || response_text.contains("NOT_FOUND") {
                return Err(format!(
                    "{} 모델을 사용할 수 없습니다. Google AI Studio에서 Imagen API 액세스가 활성화되어 있는지 확인해주세요.",
                    model_name
                ));
            }
            if response_text.contains("PERMISSION_DENIED") || response_text.contains("permission") {
                return Err(format!(
                    "{} 권한이 없습니다. API 키에 Imagen API 권한이 있는지 확인해주세요.",
                    model_name
                ));
            }
            if response_text.contains("INVALID_ARGUMENT") {
                return Err(format!(
                    "잘못된 요청입니다. aspectRatio({})가 지원되는 값인지 확인해주세요. 지원 값: 1:1, 3:4, 4:3, 9:16, 16:9",
                    aspect_ratio
                ));
            }
            return Err(format!("Imagen API 오류 ({}): {}", status, response_text));
        }

        let result: ImagenResponse = serde_json::from_str(&response_text)
            .map_err(|e| format!("응답 파싱 실패: {}", e))?;

        // Try generatedImages format first (standard Imagen response)
        if let Some(images) = result.generated_images {
            if let Some(img) = images.into_iter().next() {
                println!("Image generated successfully via generatedImages format");
                return Ok(format!("data:image/png;base64,{}", img.image.image_bytes));
            }
        }

        // Try predictions format (Vertex AI style fallback)
        if let Some(predictions) = result.predictions {
            if let Some(pred) = predictions.into_iter().next() {
                if let Some(base64_data) = pred.bytes_base64_encoded {
                    println!("Image generated successfully via predictions format");
                    return Ok(format!("data:image/png;base64,{}", base64_data));
                }
            }
        }

        Err(format!("{} 이미지 생성 결과가 없습니다. 다른 모델을 시도해보세요.", model_name))
    }

    /// Analyze image and generate prompt description
    pub async fn analyze_image_for_prompt(
        &self,
        base64_image: &str,
        mime_type: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<String, String> {
        let mut contents = vec![];

        // Add system instruction
        contents.push(GeminiContent {
            parts: vec![GeminiPart {
                text: Some(system_prompt.to_string()),
                inline_data: None,
            }],
            role: Some("user".to_string()),
        });
        contents.push(GeminiContent {
            parts: vec![GeminiPart {
                text: Some("알겠습니다. 지침을 따르겠습니다.".to_string()),
                inline_data: None,
            }],
            role: Some("model".to_string()),
        });

        // Add user message with image
        contents.push(GeminiContent {
            parts: vec![
                GeminiPart {
                    text: None,
                    inline_data: Some(InlineData {
                        mime_type: mime_type.to_string(),
                        data: base64_image.to_string(),
                    }),
                },
                GeminiPart {
                    text: Some(user_prompt.to_string()),
                    inline_data: None,
                },
            ],
            role: Some("user".to_string()),
        });

        let request = GeminiRequest {
            contents,
            generation_config: Some(GenerationConfig {
                temperature: 0.7,
                max_output_tokens: 2048,
            }),
        };

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
            self.api_key
        );

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Gemini Vision API 요청 실패: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Gemini Vision API 오류: {}", error_text));
        }

        let result: GeminiResponse = response
            .json()
            .await
            .map_err(|e| format!("응답 파싱 실패: {}", e))?;

        result
            .candidates
            .first()
            .and_then(|c| c.content.parts.first())
            .and_then(|p| p.text.clone())
            .ok_or_else(|| "응답이 비어있습니다".to_string())
    }

    /// Search web using Google Custom Search API
    pub async fn search_web(&self, query: &str, cx: &str) -> Result<Vec<SearchResult>, String> {
        let url = format!(
            "https://www.googleapis.com/customsearch/v1?key={}&cx={}&q={}&num=10",
            self.api_key,
            cx,
            urlencoding::encode(query)
        );

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Google Search API 요청 실패: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Google Search API 오류: {}", error_text));
        }

        let result: SearchResponse = response
            .json()
            .await
            .map_err(|e| format!("응답 파싱 실패: {}", e))?;

        Ok(result.items.unwrap_or_default())
    }
}

#[derive(Debug, Deserialize)]
pub struct SearchResponse {
    items: Option<Vec<SearchResult>>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct SearchResult {
    pub title: String,
    pub link: String,
    pub snippet: Option<String>,
}
