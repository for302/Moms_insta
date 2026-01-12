use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

pub struct OpenAIService {
    client: Client,
    api_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
    max_tokens: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ImageGenerationResponse {
    data: Vec<ImageData>,
}

#[derive(Debug, Deserialize)]
struct ImageData {
    url: Option<String>,
    b64_json: Option<String>,
}

impl OpenAIService {
    pub fn new(api_key: &str) -> Self {
        Self {
            client: Client::new(),
            api_key: api_key.to_string(),
        }
    }

    pub async fn generate_text(&self, prompt: &str, system_prompt: Option<&str>) -> Result<String, String> {
        let mut messages = vec![];

        if let Some(sys) = system_prompt {
            messages.push(ChatMessage {
                role: "system".to_string(),
                content: sys.to_string(),
            });
        }

        messages.push(ChatMessage {
            role: "user".to_string(),
            content: prompt.to_string(),
        });

        let request = ChatCompletionRequest {
            model: "gpt-4o-mini".to_string(),
            messages,
            temperature: 0.7,
            max_tokens: Some(4096),
        };

        let response = self.client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("OpenAI API 요청 실패: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("OpenAI API 오류: {}", error_text));
        }

        let result: ChatCompletionResponse = response
            .json()
            .await
            .map_err(|e| format!("응답 파싱 실패: {}", e))?;

        result.choices
            .first()
            .map(|c| c.message.content.clone())
            .ok_or_else(|| "응답이 비어있습니다".to_string())
    }

    pub async fn generate_image(&self, prompt: &str, size: &str) -> Result<String, String> {
        let request_body = json!({
            "model": "dall-e-3",
            "prompt": prompt,
            "n": 1,
            "size": size,
            "quality": "standard",
            "response_format": "url"
        });

        let response = self.client
            .post("https://api.openai.com/v1/images/generations")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("DALL-E API 요청 실패: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("DALL-E API 오류: {}", error_text));
        }

        let result: ImageGenerationResponse = response
            .json()
            .await
            .map_err(|e| format!("응답 파싱 실패: {}", e))?;

        result.data
            .first()
            .and_then(|d| d.url.clone())
            .ok_or_else(|| "이미지 URL이 없습니다".to_string())
    }

    pub async fn analyze_image_for_prompt(
        &self,
        base64_image: &str,
        mime_type: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<String, String> {
        let request_body = json!({
            "model": "gpt-4o",
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": user_prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": format!("data:{};base64,{}", mime_type, base64_image)
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 2048
        });

        let response = self.client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("OpenAI Vision API 요청 실패: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("OpenAI Vision API 오류: {}", error_text));
        }

        let result: ChatCompletionResponse = response
            .json()
            .await
            .map_err(|e| format!("응답 파싱 실패: {}", e))?;

        result.choices
            .first()
            .map(|c| c.message.content.clone())
            .ok_or_else(|| "응답이 비어있습니다".to_string())
    }
}
