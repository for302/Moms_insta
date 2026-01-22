use crate::models::{CharacterPersona, ContentGenerationRequest, ContentPlanItem};
use crate::services::anthropic::AnthropicService;
use crate::services::google::GoogleService;
use crate::services::openai::OpenAIService;
use uuid::Uuid;

/// Create a character persona name from keyword
fn extract_character_name(keyword: &str) -> String {
    let cleaned: String = keyword
        .chars()
        .filter(|c| c.is_alphabetic() || (*c >= '\u{AC00}' && *c <= '\u{D7A3}'))
        .collect();

    // For Korean keywords, take first 2 characters
    // For English keywords, take first 4 characters
    if cleaned.chars().any(|c| c >= '\u{AC00}' && c <= '\u{D7A3}') {
        cleaned.chars().take(2).collect()
    } else {
        cleaned.chars().take(4).collect()
    }
}

#[tauri::command]
pub async fn create_persona(keyword: String) -> Result<CharacterPersona, String> {
    if keyword.trim().is_empty() {
        return Err("키워드를 입력해주세요.".to_string());
    }

    let name = extract_character_name(&keyword);

    Ok(CharacterPersona {
        name: name.clone(),
        description: format!("{}의 비밀을 연구하는 귀여운 캐릭터", keyword),
        personality_traits: vec![
            "호기심 많은".to_string(),
            "친근한".to_string(),
            "전문적인".to_string(),
            "따뜻한".to_string(),
        ],
    })
}

#[tauri::command]
pub async fn generate_content_plan(
    request: ContentGenerationRequest,
) -> Result<Vec<ContentPlanItem>, String> {
    if request.keyword.trim().is_empty() {
        return Err("키워드를 입력해주세요.".to_string());
    }

    let api_key = request
        .api_key
        .clone()
        .ok_or_else(|| "API 키가 설정되지 않았습니다.".to_string())?;

    let provider = request.llm_provider.clone().unwrap_or_else(|| "openai".to_string());
    let character_name = extract_character_name(&request.keyword);
    let count = request.count.min(20).max(1);

    // Create content generation prompt
    let system_prompt = format!(
        r#"당신은 인스타그램 뷰티 콘텐츠 기획 전문가입니다.
화장품 성분에 대한 교육적인 캐러셀 콘텐츠를 기획합니다.

타겟: 육아맘, 예비맘 (성분에 민감한 사용자)
캐릭터: {} (성분을 의인화한 귀여운 캐릭터)
형식: {}의 연구일지

각 콘텐츠는 다음 JSON 배열 형식으로 작성하세요:
[
  {{
    "title": "매력적인 제목",
    "content": "50자 내외의 핵심 내용 (이모지 사용 가능)",
    "image_concept": "이미지 생성을 위한 상세한 컨셉 설명"
  }},
  ...
]

주의사항:
- 과학적 근거에 기반하되 쉽게 설명
- 임산부/아기에게 안전한 정보 중심
- 긍정적이고 따뜻한 톤
- JSON 배열만 출력하세요"#,
        character_name, character_name
    );

    let prompt = format!(
        "'{}'에 대한 {}개의 인스타그램 캐러셀 콘텐츠를 기획해주세요.\n\n추가 정보:\n{}",
        request.keyword,
        count,
        request.research_data.clone().unwrap_or_default()
    );

    // Call LLM
    let response = match provider.as_str() {
        "anthropic" => {
            let service = AnthropicService::new(&api_key);
            service.generate_text(&prompt, Some(&system_prompt)).await?
        }
        "google" => {
            let service = GoogleService::new(&api_key);
            service.generate_text(&prompt, Some(&system_prompt)).await?
        }
        _ => {
            let service = OpenAIService::new(&api_key);
            service.generate_text(&prompt, Some(&system_prompt)).await?
        }
    };

    // Parse response
    let items = parse_content_plan(&response, &character_name, &request.keyword)?;
    Ok(items)
}

fn parse_content_plan(
    response: &str,
    character_name: &str,
    keyword: &str,
) -> Result<Vec<ContentPlanItem>, String> {
    // Extract JSON array from response
    let json_str = extract_json_array(response);

    #[derive(serde::Deserialize)]
    struct LLMContent {
        title: String,
        content: String,
        image_concept: String,
    }

    let parsed: Vec<LLMContent> = serde_json::from_str(&json_str).unwrap_or_else(|_| {
        // Fallback to default content if parsing fails
        generate_fallback_content(keyword, 10)
            .into_iter()
            .map(|f| LLMContent {
                title: f.title,
                content: f.content,
                image_concept: f.image_concept,
            })
            .collect()
    });

    let items: Vec<ContentPlanItem> = parsed
        .into_iter()
        .enumerate()
        .map(|(i, c)| ContentPlanItem {
            id: Uuid::new_v4().to_string(),
            title: c.title,
            character_name: character_name.to_string(),
            journal_number: (i + 1) as u32,
            content: c.content,
            image_concept: c.image_concept,
            status: "pending".to_string(),
        })
        .collect();

    Ok(items)
}

fn extract_json_array(text: &str) -> String {
    // Find JSON array in the response
    if let Some(start) = text.find('[') {
        if let Some(end) = text.rfind(']') {
            return text[start..=end].to_string();
        }
    }
    "[]".to_string()
}

#[derive(serde::Serialize, serde::Deserialize)]
struct FallbackContent {
    title: String,
    content: String,
    image_concept: String,
}

fn generate_fallback_content(keyword: &str, count: usize) -> Vec<FallbackContent> {
    let topics = vec![
        ("기초 효능", "피부에 미치는 기본적인 효과를 알아봐요 ✨"),
        ("보습 메커니즘", "피부 속 수분을 어떻게 지켜줄까요? 💧"),
        ("장벽 강화", "피부 장벽을 튼튼하게 만드는 비결 🛡️"),
        ("진정 효과", "민감해진 피부를 달래주는 방법 🌿"),
        ("아기 피부", "연약한 아기 피부에도 안전해요 👶"),
        ("임산부 안전성", "임산부도 안심하고 사용할 수 있어요 🤰"),
        ("EWG 등급", "안전성 등급이 의미하는 것 📊"),
        ("적정 농도", "얼마나 들어있으면 효과적일까요? 🧪"),
        ("함께 쓰면 좋은 성분", "시너지를 내는 조합 💪"),
        ("제형별 특징", "크림, 세럼, 에센스의 차이 🧴"),
    ];

    topics
        .into_iter()
        .take(count)
        .map(|(title, content)| FallbackContent {
            title: format!("{} - {}", keyword, title),
            content: content.to_string(),
            image_concept: format!(
                "귀여운 캐릭터가 연구실에서 {}을(를) 분석하며 {} 포인트를 설명하는 일러스트",
                keyword, title
            ),
        })
        .collect()
}

#[tauri::command]
pub async fn translate_to_korean(
    text: String,
    api_key: String,
    provider: String,
) -> Result<String, String> {
    if text.trim().is_empty() {
        return Ok(text);
    }

    let system_prompt = "You are a professional translator. Translate the given English text to Korean. Only output the translated text, nothing else. Keep the translation natural and accurate.";
    let prompt = format!("Translate the following text to Korean:\n\n{}", text);

    let response = match provider.as_str() {
        "anthropic" => {
            let service = AnthropicService::new(&api_key);
            service.generate_text(&prompt, Some(system_prompt)).await?
        }
        "google" => {
            let service = GoogleService::new(&api_key);
            service.generate_text(&prompt, Some(system_prompt)).await?
        }
        _ => {
            let service = OpenAIService::new(&api_key);
            service.generate_text(&prompt, Some(system_prompt)).await?
        }
    };

    Ok(response.trim().to_string())
}
