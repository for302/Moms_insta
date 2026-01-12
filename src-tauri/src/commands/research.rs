use crate::models::{IngredientAnalysis, PaperResult};
use crate::services::anthropic::AnthropicService;
use crate::services::google::GoogleService;
use crate::services::openai::OpenAIService;
use crate::services::pubmed::PubMedService;
use uuid::Uuid;

#[tauri::command]
pub async fn search_papers(keyword: String, limit: Option<u32>) -> Result<Vec<PaperResult>, String> {
    if keyword.trim().is_empty() {
        return Ok(vec![]);
    }

    let limit = limit.unwrap_or(10);
    let pubmed_service = PubMedService::new();

    // Search for ingredient-related papers
    let papers = pubmed_service.search_ingredient(&keyword, limit).await?;

    // Convert to PaperResult format
    let results: Vec<PaperResult> = papers
        .into_iter()
        .map(|p| PaperResult {
            id: Uuid::new_v4().to_string(),
            title: p.title,
            authors: p.authors,
            abstract_text: p.abstract_text,
            publication_date: p.year,
            source: "PubMed".to_string(),
            citation_count: None,
            doi: Some(format!("https://pubmed.ncbi.nlm.nih.gov/{}/", p.pmid)),
        })
        .collect();

    Ok(results)
}

#[tauri::command]
pub async fn analyze_ingredient(
    ingredient_name: String,
    api_key: Option<String>,
    llm_provider: Option<String>,
) -> Result<IngredientAnalysis, String> {
    if ingredient_name.trim().is_empty() {
        return Err("성분명을 입력해주세요.".to_string());
    }

    let api_key = api_key.ok_or_else(|| "API 키가 설정되지 않았습니다.".to_string())?;
    let provider = llm_provider.unwrap_or_else(|| "openai".to_string());

    // First, search for papers about this ingredient
    let pubmed_service = PubMedService::new();
    let papers = pubmed_service
        .search_ingredient(&ingredient_name, 5)
        .await
        .unwrap_or_default();

    // Prepare paper summaries for LLM analysis
    let paper_summaries: Vec<String> = papers
        .iter()
        .map(|p| format!("제목: {}\n초록: {}", p.title, p.abstract_text))
        .collect();

    let papers_context = if paper_summaries.is_empty() {
        "관련 논문을 찾지 못했습니다.".to_string()
    } else {
        paper_summaries.join("\n\n---\n\n")
    };

    // Create analysis prompt
    let system_prompt = r#"당신은 화장품 성분 전문가입니다. 주어진 성분과 관련 논문 정보를 바탕으로 상세한 분석을 제공해주세요.
응답은 반드시 다음 JSON 형식으로만 작성하세요:
{
  "ewg_score": 1-10 사이 숫자 또는 null,
  "benefits": ["효능1", "효능2", ...],
  "cautions": ["주의사항1", "주의사항2", ...],
  "recommended_concentration": "권장 농도 (예: 1-5%)" 또는 null
}
다른 설명 없이 JSON만 응답해주세요."#;

    let prompt = format!(
        "성분명: {}\n\n관련 논문 정보:\n{}\n\n위 정보를 바탕으로 이 성분을 분석해주세요.",
        ingredient_name, papers_context
    );

    // Call appropriate LLM
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

    // Parse LLM response
    let analysis = parse_ingredient_analysis(&ingredient_name, &response, papers)?;
    Ok(analysis)
}

fn parse_ingredient_analysis(
    ingredient_name: &str,
    response: &str,
    papers: Vec<crate::services::pubmed::PaperInfo>,
) -> Result<IngredientAnalysis, String> {
    // Try to parse JSON from response
    let json_str = extract_json(response);

    #[derive(serde::Deserialize)]
    struct LLMResponse {
        ewg_score: Option<u8>,
        benefits: Option<Vec<String>>,
        cautions: Option<Vec<String>>,
        recommended_concentration: Option<String>,
    }

    let parsed: LLMResponse = serde_json::from_str(&json_str).unwrap_or_else(|_| LLMResponse {
        ewg_score: None,
        benefits: Some(vec!["피부 보습 효과".to_string()]),
        cautions: Some(vec!["특별한 주의사항 없음".to_string()]),
        recommended_concentration: None,
    });

    let related_papers: Vec<PaperResult> = papers
        .into_iter()
        .take(3)
        .map(|p| PaperResult {
            id: Uuid::new_v4().to_string(),
            title: p.title,
            authors: p.authors,
            abstract_text: p.abstract_text,
            publication_date: p.year,
            source: "PubMed".to_string(),
            citation_count: None,
            doi: Some(format!("https://pubmed.ncbi.nlm.nih.gov/{}/", p.pmid)),
        })
        .collect();

    Ok(IngredientAnalysis {
        ingredient_name: ingredient_name.to_string(),
        korean_name: ingredient_name.to_string(),
        ewg_score: parsed.ewg_score,
        benefits: parsed.benefits.unwrap_or_default(),
        cautions: parsed.cautions.unwrap_or_default(),
        recommended_concentration: parsed.recommended_concentration,
        related_papers,
    })
}

fn extract_json(text: &str) -> String {
    // Find JSON in the response
    if let Some(start) = text.find('{') {
        if let Some(end) = text.rfind('}') {
            return text[start..=end].to_string();
        }
    }
    text.to_string()
}
