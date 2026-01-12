use crate::models::{ApiKeys, AppSettings, ImagePrompt, LayoutSettings};
use crate::services::anthropic::AnthropicService;
use crate::services::google::GoogleService;
use crate::services::openai::OpenAIService;
use base64::{engine::general_purpose::STANDARD, Engine};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Calculate greatest common divisor using Euclidean algorithm
fn gcd(a: u32, b: u32) -> u32 {
    if b == 0 { a } else { gcd(b, a % b) }
}

fn get_config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|e| format!("설정 디렉토리를 찾을 수 없습니다: {}", e))
}

fn get_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = get_config_dir(app)?;
    Ok(config_dir.join("settings.json"))
}

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    let path = get_settings_path(&app)?;

    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("설정 파일을 읽을 수 없습니다: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("설정 파일을 파싱할 수 없습니다: {}", e))
}

#[tauri::command]
pub async fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let config_dir = get_config_dir(&app)?;

    // Create directory if it doesn't exist
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("설정 디렉토리를 생성할 수 없습니다: {}", e))?;

    let path = config_dir.join("settings.json");
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("설정을 직렬화할 수 없습니다: {}", e))?;

    fs::write(&path, content)
        .map_err(|e| format!("설정 파일을 저장할 수 없습니다: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn save_api_keys(app: AppHandle, keys: ApiKeys) -> Result<(), String> {
    let mut settings = get_settings(app.clone()).await?;
    settings.api_keys = keys;
    save_settings(app, settings).await
}

#[tauri::command]
pub async fn get_save_path(app: AppHandle) -> Result<String, String> {
    let settings = get_settings(app).await?;
    Ok(settings.save_path)
}

#[tauri::command]
pub async fn set_save_path(app: AppHandle, path: String) -> Result<(), String> {
    let mut settings = get_settings(app.clone()).await?;
    settings.save_path = path;
    save_settings(app, settings).await
}

#[tauri::command]
pub async fn validate_openai_key(api_key: String) -> Result<bool, String> {
    if api_key.trim().is_empty() {
        return Err("API 키가 비어있습니다.".to_string());
    }

    let service = OpenAIService::new(&api_key);

    // Test with a simple request
    match service.generate_text("Say 'ok' if you can hear me.", None).await {
        Ok(_) => Ok(true),
        Err(e) => {
            let error_lower = e.to_lowercase();

            if error_lower.contains("invalid_api_key") || error_lower.contains("401") {
                Err("API 키가 올바르지 않습니다. OpenAI 대시보드에서 키를 확인해주세요.".to_string())
            } else if error_lower.contains("insufficient_quota") || error_lower.contains("429") {
                Err("API 사용량 한도를 초과했거나 크레딧이 부족합니다. OpenAI 결제 설정을 확인해주세요.".to_string())
            } else if error_lower.contains("rate_limit") {
                Err("요청 속도 제한에 걸렸습니다. 잠시 후 다시 시도해주세요.".to_string())
            } else if error_lower.contains("model_not_found") {
                Err("모델을 찾을 수 없습니다. API 키의 접근 권한을 확인해주세요.".to_string())
            } else {
                Err(format!("OpenAI API 검증 실패: {}", e))
            }
        }
    }
}

#[tauri::command]
pub async fn validate_anthropic_key(api_key: String) -> Result<bool, String> {
    if api_key.trim().is_empty() {
        return Err("API 키가 비어있습니다.".to_string());
    }

    let service = AnthropicService::new(&api_key);

    // Test with a simple request
    match service.generate_text("Say 'ok' if you can hear me.", None).await {
        Ok(_) => Ok(true),
        Err(e) => {
            let error_lower = e.to_lowercase();

            if error_lower.contains("authentication") || error_lower.contains("401") || error_lower.contains("invalid") {
                Err("API 키가 올바르지 않습니다. Anthropic Console에서 키를 확인해주세요.".to_string())
            } else if error_lower.contains("rate_limit") || error_lower.contains("429") {
                Err("요청 속도 제한에 걸렸습니다. 잠시 후 다시 시도해주세요.".to_string())
            } else if error_lower.contains("overloaded") || error_lower.contains("529") {
                Err("Anthropic 서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요.".to_string())
            } else if error_lower.contains("credit") || error_lower.contains("billing") {
                Err("크레딧이 부족합니다. Anthropic Console에서 결제 설정을 확인해주세요.".to_string())
            } else {
                Err(format!("Anthropic API 검증 실패: {}", e))
            }
        }
    }
}

#[tauri::command]
pub async fn validate_google_key(api_key: String) -> Result<bool, String> {
    if api_key.trim().is_empty() {
        return Err("API 키가 비어있습니다.".to_string());
    }

    let service = GoogleService::new(&api_key);

    // Test with a simple request
    match service.generate_text("Say 'ok' if you can hear me.", None).await {
        Ok(_) => Ok(true),
        Err(e) => {
            // Parse error to provide more helpful guidance
            let error_lower = e.to_lowercase();

            if error_lower.contains("api_key_invalid") || error_lower.contains("invalid api key") || error_lower.contains("api key not valid") {
                Err("API 키가 올바르지 않습니다. Google AI Studio(aistudio.google.com)에서 키를 생성해주세요.".to_string())
            } else if error_lower.contains("permission_denied") || error_lower.contains("403") {
                Err(format!("API 키 권한 오류입니다. Google AI Studio(aistudio.google.com)에서 새 API 키를 생성해주세요.\n\n상세: {}", e))
            } else if error_lower.contains("quota") || error_lower.contains("rate") || error_lower.contains("429") {
                Err("API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.".to_string())
            } else if error_lower.contains("not found") || error_lower.contains("404") {
                Err("Gemini API를 찾을 수 없습니다. API가 활성화되어 있는지 확인해주세요.".to_string())
            } else if error_lower.contains("billing") {
                Err("결제 설정이 필요합니다. Google Cloud Console에서 결제를 활성화해주세요.".to_string())
            } else {
                Err(format!("Google API 검증 실패: {}", e))
            }
        }
    }
}

#[tauri::command]
pub async fn generate_preview_image(
    app: AppHandle,
    prompt_id: String,
    prompt: String,
    api_key: String,
    provider: String,
    model: Option<String>,
    aspect_ratio: Option<String>,
    negative_prompt: Option<String>,
) -> Result<String, String> {
    if prompt.trim().is_empty() {
        return Err("프롬프트가 비어있습니다.".to_string());
    }

    if api_key.trim().is_empty() {
        return Err("API 키가 설정되지 않았습니다.".to_string());
    }

    // Create previews directory
    let config_dir = get_config_dir(&app)?;
    let previews_dir = config_dir.join("previews");
    fs::create_dir_all(&previews_dir)
        .map_err(|e| format!("미리보기 디렉토리를 생성할 수 없습니다: {}", e))?;

    // Use provided aspect ratio or default to 3:4 (Instagram style)
    let img_aspect_ratio = aspect_ratio.unwrap_or_else(|| "3:4".to_string());

    // Get model or use default (Imagen 4 Standard)
    let google_model = model.unwrap_or_else(|| "imagen-4.0-generate-001".to_string());

    // OpenAI size string based on aspect ratio
    let openai_size = match img_aspect_ratio.as_str() {
        "1:1" => "1024x1024",
        "4:3" | "16:9" => "1792x1024",
        "3:4" | "9:16" => "1024x1792",
        _ => "1024x1024",
    };

    // Generate image based on provider
    let image_data = match provider.as_str() {
        "openai" => {
            let service = OpenAIService::new(&api_key);
            service.generate_image(&prompt, openai_size).await?
        }
        _ => {
            // Default to Google with Imagen API
            let service = GoogleService::new(&api_key);
            service.generate_image_with_model(
                &prompt,
                &img_aspect_ratio,
                &google_model,
                negative_prompt.as_deref(),
            ).await?
        }
    };

    // Save image to previews directory
    let file_path = previews_dir.join(format!("{}.png", prompt_id));

    // Handle base64 data URL or regular URL
    if image_data.starts_with("data:image") {
        // Base64 data URL
        let base64_data = image_data
            .split(',')
            .nth(1)
            .ok_or_else(|| "잘못된 이미지 데이터 형식입니다.".to_string())?;

        let decoded = STANDARD
            .decode(base64_data)
            .map_err(|e| format!("이미지 디코딩 실패: {}", e))?;

        fs::write(&file_path, decoded)
            .map_err(|e| format!("이미지 저장 실패: {}", e))?;
    } else {
        // URL - download the image
        let client = reqwest::Client::new();
        let response = client
            .get(&image_data)
            .send()
            .await
            .map_err(|e| format!("이미지 다운로드 실패: {}", e))?;

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("이미지 데이터 읽기 실패: {}", e))?;

        fs::write(&file_path, bytes)
            .map_err(|e| format!("이미지 저장 실패: {}", e))?;
    }

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn save_image_prompt(app: AppHandle, prompt: ImagePrompt) -> Result<(), String> {
    let mut settings = get_settings(app.clone()).await?;

    // Find and update existing prompt or add new one
    if let Some(existing) = settings.image_prompts.iter_mut().find(|p| p.id == prompt.id) {
        existing.name = prompt.name;
        existing.prompt = prompt.prompt;
        existing.style_image_path = prompt.style_image_path;
        existing.preview_image_path = prompt.preview_image_path;
    } else {
        settings.image_prompts.push(prompt);
    }

    save_settings(app, settings).await
}

#[tauri::command]
pub async fn delete_image_prompt(app: AppHandle, prompt_id: String) -> Result<(), String> {
    let mut settings = get_settings(app.clone()).await?;

    // Check if it's a default prompt
    if let Some(prompt) = settings.image_prompts.iter().find(|p| p.id == prompt_id) {
        if prompt.is_default {
            return Err("기본 프롬프트는 삭제할 수 없습니다.".to_string());
        }
    }

    settings.image_prompts.retain(|p| p.id != prompt_id);
    save_settings(app, settings).await
}

#[tauri::command]
pub async fn save_layout_settings(app: AppHandle, layout: LayoutSettings) -> Result<(), String> {
    let mut settings = get_settings(app.clone()).await?;
    settings.layout_settings = layout;
    save_settings(app, settings).await
}

#[tauri::command]
pub async fn generate_prompt_from_image(
    image_path: String,
    api_key: String,
    provider: String,
) -> Result<String, String> {
    if image_path.trim().is_empty() {
        return Err("이미지 경로가 비어있습니다.".to_string());
    }

    if api_key.trim().is_empty() {
        return Err("API 키가 설정되지 않았습니다.".to_string());
    }

    // Read image file and convert to base64
    let image_data = fs::read(&image_path)
        .map_err(|e| format!("이미지 파일을 읽을 수 없습니다: {}", e))?;

    let base64_image = STANDARD.encode(&image_data);

    // Determine mime type from extension
    let mime_type = if image_path.to_lowercase().ends_with(".png") {
        "image/png"
    } else if image_path.to_lowercase().ends_with(".jpg") || image_path.to_lowercase().ends_with(".jpeg") {
        "image/jpeg"
    } else if image_path.to_lowercase().ends_with(".webp") {
        "image/webp"
    } else {
        "image/png" // default
    };

    let system_prompt = r#"당신은 이미지 스타일 분석 전문가입니다. 주어진 이미지를 분석하여 이 이미지를 AI 이미지 생성 모델로 재현하기 위한 상세한 프롬프트를 작성해주세요.

다음 요소들을 포함하여 분석해주세요:
1. 전체적인 스타일 (일러스트, 사진, 3D 렌더링, 수채화 등)
2. 색상 팔레트와 톤 (밝은/어두운, 따뜻한/차가운, 파스텔/비비드 등)
3. 캐릭터/인물 특징 (있는 경우)
4. 배경 스타일과 구성
5. 조명과 그림자 처리
6. 텍스처와 질감
7. 전체적인 분위기와 감성

결과는 영어로 된 이미지 생성 프롬프트 형태로 작성해주세요. 프롬프트만 출력하고 다른 설명은 포함하지 마세요."#;

    let user_prompt = "이 이미지의 스타일을 분석하여 AI 이미지 생성을 위한 상세한 프롬프트를 작성해주세요.";

    // Call LLM with vision capability
    match provider.as_str() {
        "openai" => {
            let service = OpenAIService::new(&api_key);
            service.analyze_image_for_prompt(&base64_image, mime_type, system_prompt, user_prompt).await
        }
        "anthropic" => {
            let service = AnthropicService::new(&api_key);
            service.analyze_image_for_prompt(&base64_image, mime_type, system_prompt, user_prompt).await
        }
        _ => {
            // Default to Google
            let service = GoogleService::new(&api_key);
            service.analyze_image_for_prompt(&base64_image, mime_type, system_prompt, user_prompt).await
        }
    }
}

#[tauri::command]
pub async fn get_system_fonts() -> Result<Vec<String>, String> {
    let mut fonts: HashSet<String> = HashSet::new();

    // Windows fonts directories
    #[cfg(target_os = "windows")]
    {
        // System fonts
        if let Ok(windows_dir) = std::env::var("WINDIR") {
            let system_fonts = PathBuf::from(&windows_dir).join("Fonts");
            if system_fonts.exists() {
                collect_fonts_from_dir(&system_fonts, &mut fonts);
            }
        }

        // User fonts
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let user_fonts = PathBuf::from(&local_app_data)
                .join("Microsoft")
                .join("Windows")
                .join("Fonts");
            if user_fonts.exists() {
                collect_fonts_from_dir(&user_fonts, &mut fonts);
            }
        }
    }

    // macOS fonts directories
    #[cfg(target_os = "macos")]
    {
        let font_dirs = vec![
            PathBuf::from("/System/Library/Fonts"),
            PathBuf::from("/Library/Fonts"),
            dirs::home_dir().map(|h| h.join("Library/Fonts")).unwrap_or_default(),
        ];

        for dir in font_dirs {
            if dir.exists() {
                collect_fonts_from_dir(&dir, &mut fonts);
            }
        }
    }

    // Linux fonts directories
    #[cfg(target_os = "linux")]
    {
        let font_dirs = vec![
            PathBuf::from("/usr/share/fonts"),
            PathBuf::from("/usr/local/share/fonts"),
            dirs::home_dir().map(|h| h.join(".fonts")).unwrap_or_default(),
            dirs::home_dir().map(|h| h.join(".local/share/fonts")).unwrap_or_default(),
        ];

        for dir in font_dirs {
            if dir.exists() {
                collect_fonts_from_dir(&dir, &mut fonts);
            }
        }
    }

    let mut font_list: Vec<String> = fonts.into_iter().collect();
    font_list.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));

    Ok(font_list)
}

fn collect_fonts_from_dir(dir: &PathBuf, fonts: &mut HashSet<String>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();

            if path.is_dir() {
                // Recursively search subdirectories
                collect_fonts_from_dir(&path, fonts);
            } else if let Some(ext) = path.extension() {
                let ext_lower = ext.to_string_lossy().to_lowercase();
                if ext_lower == "ttf" || ext_lower == "otf" {
                    // Try to read actual font family name from font metadata
                    if let Some(font_name) = get_font_family_name(&path) {
                        if !font_name.is_empty() {
                            fonts.insert(font_name);
                        }
                    }
                } else if ext_lower == "ttc" {
                    // TTC files can contain multiple fonts
                    if let Ok(data) = fs::read(&path) {
                        if let Some(count) = ttf_parser::fonts_in_collection(&data) {
                            for index in 0..count {
                                if let Ok(face) = ttf_parser::Face::parse(&data, index) {
                                    if let Some(name) = extract_family_name(&face) {
                                        fonts.insert(name);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Read actual font family name from font file metadata
fn get_font_family_name(path: &PathBuf) -> Option<String> {
    let data = fs::read(path).ok()?;
    let face = ttf_parser::Face::parse(&data, 0).ok()?;
    extract_family_name(&face)
}

/// Extract font family name from parsed font face
fn extract_family_name(face: &ttf_parser::Face) -> Option<String> {
    // Try to find the font family name in the naming table
    // Priority: Windows platform with Korean (1042), then English (1033), then any
    let names = face.names();

    // Name ID 1 = Font Family Name
    // Name ID 16 = Typographic Family Name (preferred)

    // First try typographic family name (ID 16)
    let mut family_name: Option<String> = None;

    // Try to get Korean name first (platform 3, encoding 1, language 1042)
    for name in names.into_iter() {
        if name.name_id == ttf_parser::name_id::TYPOGRAPHIC_FAMILY || name.name_id == ttf_parser::name_id::FAMILY {
            if let Some(name_str) = name.to_string() {
                // Prefer Korean name if available
                if name.language_id == 1042 {
                    return Some(name_str);
                }
                // Otherwise use English or first available
                if family_name.is_none() || name.language_id == 1033 {
                    family_name = Some(name_str);
                }
            }
        }
    }

    family_name
}

#[tauri::command]
pub async fn delete_image_file(path: String) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("경로가 비어있습니다.".to_string());
    }

    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        // 파일이 이미 없으면 성공으로 처리
        return Ok(());
    }

    fs::remove_file(&file_path)
        .map_err(|e| format!("파일 삭제 실패: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn open_folder_in_explorer(path: String) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("경로가 비어있습니다.".to_string());
    }

    let folder_path = PathBuf::from(&path);

    // Check if path exists, if not try parent directory
    let target_path = if folder_path.exists() {
        folder_path
    } else if let Some(parent) = folder_path.parent() {
        if parent.exists() {
            parent.to_path_buf()
        } else {
            return Err(format!("폴더가 존재하지 않습니다: {}", path));
        }
    } else {
        return Err(format!("폴더가 존재하지 않습니다: {}", path));
    };

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(target_path)
            .spawn()
            .map_err(|e| format!("탐색기를 열 수 없습니다: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(target_path)
            .spawn()
            .map_err(|e| format!("Finder를 열 수 없습니다: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(target_path)
            .spawn()
            .map_err(|e| format!("파일 관리자를 열 수 없습니다: {}", e))?;
    }

    Ok(())
}
