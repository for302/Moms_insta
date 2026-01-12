use crate::models::{GeneratedImage, ImageGenerationRequest};
use crate::services::google::GoogleService;
use crate::services::openai::OpenAIService;
use base64::{engine::general_purpose::STANDARD, Engine};
use std::fs;
use std::path::Path;
use uuid::Uuid;

#[tauri::command]
pub async fn generate_image(
    request: ImageGenerationRequest,
    api_key: Option<String>,
    provider: Option<String>,
    model: Option<String>,
    aspect_ratio: Option<String>,
    negative_prompt: Option<String>,
) -> Result<GeneratedImage, String> {
    if request.image_concept.trim().is_empty() {
        return Err("이미지 컨셉을 입력해주세요.".to_string());
    }

    let api_key = api_key.ok_or_else(|| "API 키가 설정되지 않았습니다.".to_string())?;
    let provider = provider.unwrap_or_else(|| "google".to_string());
    let google_model = model.unwrap_or_else(|| "imagen-4.0-generate-001".to_string());
    let img_aspect_ratio = aspect_ratio.unwrap_or_else(|| "1:1".to_string());

    // Combine image concept with style prompt (if provided)
    let final_prompt = if request.style_prompt.is_empty() {
        request.image_concept.clone()
    } else {
        format!("{}\n\nStyle: {}", request.image_concept, request.style_prompt)
    };

    let image_id = Uuid::new_v4().to_string();

    // OpenAI size string based on aspect ratio
    let openai_size = match img_aspect_ratio.as_str() {
        "1:1" => "1024x1024",
        "4:3" | "16:9" => "1792x1024",
        "3:4" | "9:16" => "1024x1792",
        _ => "1024x1024",
    };

    // Generate image using the selected provider
    let image_url = match provider.as_str() {
        "google" | "gemini" => {
            let service = GoogleService::new(&api_key);
            service.generate_image_with_model(
                &final_prompt,
                &img_aspect_ratio,
                &google_model,
                negative_prompt.as_deref(),
            ).await?
        }
        _ => {
            // Default to OpenAI DALL-E
            let service = OpenAIService::new(&api_key);
            service.generate_image(&final_prompt, openai_size).await?
        }
    };

    // Calculate dimensions based on aspect ratio
    let (width, height) = match img_aspect_ratio.as_str() {
        "1:1" => (1024, 1024),
        "4:3" => (1024, 768),
        "3:4" => (768, 1024),
        "16:9" => (1024, 576),
        "9:16" => (576, 1024),
        _ => (1024, 1024),
    };

    Ok(GeneratedImage {
        id: image_id,
        content_id: request.content_id,
        url: image_url,
        local_path: None,
        width,
        height,
    })
}

#[tauri::command]
pub async fn generate_batch_images(
    requests: Vec<ImageGenerationRequest>,
    api_key: Option<String>,
    provider: Option<String>,
    model: Option<String>,
    aspect_ratio: Option<String>,
    negative_prompt: Option<String>,
) -> Result<Vec<GeneratedImage>, String> {
    let mut results = Vec::new();
    let total = requests.len();

    for (index, request) in requests.into_iter().enumerate() {
        println!("이미지 생성 중: {}/{}", index + 1, total);

        match generate_image(
            request,
            api_key.clone(),
            provider.clone(),
            model.clone(),
            aspect_ratio.clone(),
            negative_prompt.clone(),
        ).await {
            Ok(image) => results.push(image),
            Err(e) => {
                eprintln!("이미지 {} 생성 실패: {}", index + 1, e);
                // Continue with next image instead of failing completely
            }
        }

        // Add small delay to avoid rate limiting
        if index < total - 1 {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        }
    }

    if results.is_empty() {
        return Err("모든 이미지 생성에 실패했습니다.".to_string());
    }

    Ok(results)
}

#[tauri::command]
pub async fn download_image(
    image_url: String,
    save_path: String,
    _with_text: Option<bool>,
) -> Result<String, String> {
    if image_url.trim().is_empty() {
        return Err("이미지 URL을 입력해주세요.".to_string());
    }

    if save_path.trim().is_empty() {
        return Err("저장 경로를 설정해주세요.".to_string());
    }

    // Create directory if it doesn't exist
    if let Some(parent) = Path::new(&save_path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("디렉토리 생성 실패: {}", e))?;
    }

    // Handle base64 data URLs
    if image_url.starts_with("data:image/") {
        let base64_data = image_url
            .split(',')
            .nth(1)
            .ok_or_else(|| "잘못된 base64 이미지 형식".to_string())?;

        let image_bytes = STANDARD
            .decode(base64_data)
            .map_err(|e| format!("Base64 디코딩 실패: {}", e))?;

        fs::write(&save_path, image_bytes).map_err(|e| format!("파일 저장 실패: {}", e))?;

        return Ok(save_path);
    }

    // Download from URL
    let client = reqwest::Client::new();
    let response = client
        .get(&image_url)
        .send()
        .await
        .map_err(|e| format!("이미지 다운로드 실패: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("이미지 다운로드 실패: HTTP {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("이미지 데이터 읽기 실패: {}", e))?;

    fs::write(&save_path, bytes).map_err(|e| format!("파일 저장 실패: {}", e))?;

    Ok(save_path)
}

#[tauri::command]
pub async fn download_all_images(
    images: Vec<GeneratedImage>,
    base_path: String,
    with_text: Option<bool>,
) -> Result<Vec<String>, String> {
    if images.is_empty() {
        return Err("다운로드할 이미지가 없습니다.".to_string());
    }

    // Create base directory
    fs::create_dir_all(&base_path).map_err(|e| format!("디렉토리 생성 실패: {}", e))?;

    let mut saved_paths = Vec::new();
    let with_text = with_text.unwrap_or(false);
    let total = images.len();

    for (index, image) in images.iter().enumerate() {
        let filename = format!("carousel_{:02}.png", index + 1);
        let path = format!("{}/{}", base_path, filename);

        println!("이미지 다운로드 중: {}/{}", index + 1, total);

        match download_image(image.url.clone(), path.clone(), Some(with_text)).await {
            Ok(saved_path) => saved_paths.push(saved_path),
            Err(e) => eprintln!("이미지 {} 다운로드 실패: {}", index + 1, e),
        }
    }

    if saved_paths.is_empty() {
        return Err("모든 이미지 다운로드에 실패했습니다.".to_string());
    }

    Ok(saved_paths)
}
