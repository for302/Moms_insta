use crate::models::KeywordSuggestion;
use uuid::Uuid;

#[tauri::command]
pub async fn suggest_keywords(keyword: String) -> Result<Vec<KeywordSuggestion>, String> {
    // TODO: Implement actual API call to Google Search or trends API
    // For now, return mock data

    if keyword.trim().is_empty() {
        return Ok(vec![]);
    }

    // Mock suggestions based on keyword
    let suggestions = vec![
        KeywordSuggestion {
            id: Uuid::new_v4().to_string(),
            keyword: format!("{} 효능", keyword),
            trend: "hot".to_string(),
            source: "google".to_string(),
        },
        KeywordSuggestion {
            id: Uuid::new_v4().to_string(),
            keyword: format!("{} 부작용", keyword),
            trend: "rising".to_string(),
            source: "google".to_string(),
        },
        KeywordSuggestion {
            id: Uuid::new_v4().to_string(),
            keyword: format!("{} 화장품", keyword),
            trend: "stable".to_string(),
            source: "google".to_string(),
        },
        KeywordSuggestion {
            id: Uuid::new_v4().to_string(),
            keyword: format!("{} 아기 피부", keyword),
            trend: "rising".to_string(),
            source: "google".to_string(),
        },
        KeywordSuggestion {
            id: Uuid::new_v4().to_string(),
            keyword: format!("{} 임산부", keyword),
            trend: "hot".to_string(),
            source: "google".to_string(),
        },
    ];

    Ok(suggestions)
}
