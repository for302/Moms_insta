use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

pub struct AnthropicService {
    client: Client,
    api_key: String,
}

#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<AnthropicMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AnthropicMessage {
    role: String,
    content: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<ContentBlock>,
}

#[derive(Debug, Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    content_type: String,
    text: Option<String>,
}

impl AnthropicService {
    pub fn new(api_key: &str) -> Self {
        Self {
            client: Client::new(),
            api_key: api_key.to_string(),
        }
    }

    pub async fn generate_text(
        &self,
        prompt: &str,
        system_prompt: Option<&str>,
    ) -> Result<String, String> {
        let request = AnthropicRequest {
            model: "claude-3-5-sonnet-20241022".to_string(),
            max_tokens: 4096,
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: json!(prompt),
            }],
            system: system_prompt.map(|s| s.to_string()),
        };

        let response = self
            .client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Anthropic API 요청 실패: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Anthropic API 오류: {}", error_text));
        }

        let result: AnthropicResponse = response
            .json()
            .await
            .map_err(|e| format!("응답 파싱 실패: {}", e))?;

        result
            .content
            .first()
            .and_then(|c| c.text.clone())
            .ok_or_else(|| "응답이 비어있습니다".to_string())
    }

    pub async fn analyze_image_for_prompt(
        &self,
        base64_image: &str,
        mime_type: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<String, String> {
        let request = AnthropicRequest {
            model: "claude-3-5-sonnet-20241022".to_string(),
            max_tokens: 2048,
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: json!([
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": base64_image
                        }
                    },
                    {
                        "type": "text",
                        "text": user_prompt
                    }
                ]),
            }],
            system: Some(system_prompt.to_string()),
        };

        let response = self
            .client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Anthropic Vision API 요청 실패: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Anthropic Vision API 오류: {}", error_text));
        }

        let result: AnthropicResponse = response
            .json()
            .await
            .map_err(|e| format!("응답 파싱 실패: {}", e))?;

        result
            .content
            .first()
            .and_then(|c| c.text.clone())
            .ok_or_else(|| "응답이 비어있습니다".to_string())
    }
}
