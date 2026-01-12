use crate::models::project::{
    Project, ProjectContentGroup, ProjectMeta, ProjectResearchItem, ProjectGeneratedImageRecord,
};
use chrono::Utc;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use uuid::Uuid;

/// Get the base directory for project storage
fn get_projects_base_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("앱 데이터 디렉토리를 찾을 수 없습니다: {}", e))?;

    let projects_dir = app_data_dir.join("projects");
    fs::create_dir_all(&projects_dir).map_err(|e| format!("프로젝트 디렉토리 생성 실패: {}", e))?;

    Ok(projects_dir)
}

/// Get project directory path
fn get_project_dir(app_handle: &tauri::AppHandle, project_id: &str) -> Result<PathBuf, String> {
    let base_dir = get_projects_base_dir(app_handle)?;
    Ok(base_dir.join(project_id))
}

/// Create project subdirectories
fn create_project_subdirs(project_dir: &PathBuf) -> Result<(), String> {
    let subdirs = ["research", "content", "images"];
    for subdir in subdirs {
        let path = project_dir.join(subdir);
        fs::create_dir_all(&path).map_err(|e| format!("{} 디렉토리 생성 실패: {}", subdir, e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn create_project(name: String, app_handle: tauri::AppHandle) -> Result<Project, String> {
    let now = Utc::now().to_rfc3339();
    let project_id = format!("proj_{}", Uuid::new_v4().to_string().replace("-", "")[..12].to_string());

    let project = Project {
        id: project_id.clone(),
        name,
        created_at: now.clone(),
        updated_at: now,
        research_items: vec![],
        content_groups: vec![],
        generated_images: vec![],
    };

    // Create project directory structure
    let project_dir = get_project_dir(&app_handle, &project_id)?;
    fs::create_dir_all(&project_dir).map_err(|e| format!("프로젝트 디렉토리 생성 실패: {}", e))?;
    create_project_subdirs(&project_dir)?;

    // Save project.json
    let project_file = project_dir.join("project.json");
    let json = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("프로젝트 직렬화 실패: {}", e))?;
    fs::write(&project_file, json).map_err(|e| format!("프로젝트 파일 저장 실패: {}", e))?;

    // Update projects index
    update_projects_index(&app_handle, &project, false).await?;

    println!("프로젝트 생성 완료: {} ({})", project.name, project.id);
    Ok(project)
}

#[tauri::command]
pub async fn load_project(
    project_id: String,
    app_handle: tauri::AppHandle,
) -> Result<Project, String> {
    let project_dir = get_project_dir(&app_handle, &project_id)?;
    let project_file = project_dir.join("project.json");

    if !project_file.exists() {
        return Err("프로젝트를 찾을 수 없습니다".to_string());
    }

    let json = fs::read_to_string(&project_file)
        .map_err(|e| format!("프로젝트 파일 읽기 실패: {}", e))?;

    let project: Project =
        serde_json::from_str(&json).map_err(|e| format!("프로젝트 파싱 실패: {}", e))?;

    println!("프로젝트 로드 완료: {} ({})", project.name, project.id);
    Ok(project)
}

#[tauri::command]
pub async fn save_project(
    project: Project,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let project_dir = get_project_dir(&app_handle, &project.id)?;

    // Ensure directory structure exists
    if !project_dir.exists() {
        fs::create_dir_all(&project_dir)
            .map_err(|e| format!("프로젝트 디렉토리 생성 실패: {}", e))?;
        create_project_subdirs(&project_dir)?;
    }

    // Save main project.json
    let project_file = project_dir.join("project.json");
    let json = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("프로젝트 직렬화 실패: {}", e))?;
    fs::write(&project_file, json).map_err(|e| format!("프로젝트 파일 저장 실패: {}", e))?;

    // Also save individual research items
    let research_dir = project_dir.join("research");
    fs::create_dir_all(&research_dir).ok();
    for research in &project.research_items {
        let research_file = research_dir.join(format!("{}.json", research.id));
        if let Ok(json) = serde_json::to_string_pretty(&research) {
            fs::write(&research_file, json).ok();
        }
    }

    // Also save individual content groups
    let content_dir = project_dir.join("content");
    fs::create_dir_all(&content_dir).ok();
    for group in &project.content_groups {
        let group_file = content_dir.join(format!("{}.json", group.id));
        if let Ok(json) = serde_json::to_string_pretty(&group) {
            fs::write(&group_file, json).ok();
        }
    }

    // Update projects index
    update_projects_index(&app_handle, &project, false).await?;

    println!("프로젝트 저장 완료: {} ({})", project.name, project.id);
    Ok(())
}

#[tauri::command]
pub async fn delete_project(
    project_id: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let project_dir = get_project_dir(&app_handle, &project_id)?;

    if project_dir.exists() {
        fs::remove_dir_all(&project_dir)
            .map_err(|e| format!("프로젝트 삭제 실패: {}", e))?;
    }

    // Remove from index
    let base_dir = get_projects_base_dir(&app_handle)?;
    let index_file = base_dir.join("projects_index.json");

    if index_file.exists() {
        let json = fs::read_to_string(&index_file).unwrap_or_else(|_| "[]".to_string());
        let mut projects: Vec<ProjectMeta> =
            serde_json::from_str(&json).unwrap_or_else(|_| vec![]);

        projects.retain(|p| p.id != project_id);

        let json = serde_json::to_string_pretty(&projects)
            .map_err(|e| format!("인덱스 직렬화 실패: {}", e))?;
        fs::write(&index_file, json).map_err(|e| format!("인덱스 저장 실패: {}", e))?;
    }

    println!("프로젝트 삭제 완료: {}", project_id);
    Ok(())
}

#[tauri::command]
pub async fn list_projects(app_handle: tauri::AppHandle) -> Result<Vec<ProjectMeta>, String> {
    let base_dir = get_projects_base_dir(&app_handle)?;
    let index_file = base_dir.join("projects_index.json");

    if !index_file.exists() {
        return Ok(vec![]);
    }

    let json = fs::read_to_string(&index_file)
        .map_err(|e| format!("인덱스 파일 읽기 실패: {}", e))?;

    let mut projects: Vec<ProjectMeta> =
        serde_json::from_str(&json).unwrap_or_else(|_| vec![]);

    // Sort by updated_at descending
    projects.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    Ok(projects)
}

#[tauri::command]
pub async fn save_research_item(
    project_id: String,
    research: ProjectResearchItem,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let project_dir = get_project_dir(&app_handle, &project_id)?;
    let research_dir = project_dir.join("research");
    fs::create_dir_all(&research_dir).map_err(|e| format!("리서치 디렉토리 생성 실패: {}", e))?;

    let research_file = research_dir.join(format!("{}.json", research.id));
    let json = serde_json::to_string_pretty(&research)
        .map_err(|e| format!("리서치 직렬화 실패: {}", e))?;
    fs::write(&research_file, json).map_err(|e| format!("리서치 파일 저장 실패: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn save_content_group(
    project_id: String,
    group: ProjectContentGroup,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let project_dir = get_project_dir(&app_handle, &project_id)?;
    let content_dir = project_dir.join("content");
    fs::create_dir_all(&content_dir).map_err(|e| format!("콘텐츠 디렉토리 생성 실패: {}", e))?;

    let group_file = content_dir.join(format!("{}.json", group.id));
    let json = serde_json::to_string_pretty(&group)
        .map_err(|e| format!("콘텐츠 그룹 직렬화 실패: {}", e))?;
    fs::write(&group_file, json).map_err(|e| format!("콘텐츠 그룹 저장 실패: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_project_images_dir(
    project_id: String,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let project_dir = get_project_dir(&app_handle, &project_id)?;
    let images_dir = project_dir.join("images");
    fs::create_dir_all(&images_dir).map_err(|e| format!("이미지 디렉토리 생성 실패: {}", e))?;

    Ok(images_dir.to_string_lossy().to_string())
}

/// Helper to update the projects index file
async fn update_projects_index(
    app_handle: &tauri::AppHandle,
    project: &Project,
    delete: bool,
) -> Result<(), String> {
    let base_dir = get_projects_base_dir(app_handle)?;
    let index_file = base_dir.join("projects_index.json");

    let mut projects: Vec<ProjectMeta> = if index_file.exists() {
        let json = fs::read_to_string(&index_file).unwrap_or_else(|_| "[]".to_string());
        serde_json::from_str(&json).unwrap_or_else(|_| vec![])
    } else {
        vec![]
    };

    // Remove existing entry
    projects.retain(|p| p.id != project.id);

    if !delete {
        // Add/update entry
        let meta = ProjectMeta {
            id: project.id.clone(),
            name: project.name.clone(),
            created_at: project.created_at.clone(),
            updated_at: project.updated_at.clone(),
            research_count: project.research_items.len(),
            content_count: project.content_groups.iter().map(|g| g.contents.len()).sum(),
            image_count: project.generated_images.len(),
        };
        projects.push(meta);
    }

    let json = serde_json::to_string_pretty(&projects)
        .map_err(|e| format!("인덱스 직렬화 실패: {}", e))?;
    fs::write(&index_file, json).map_err(|e| format!("인덱스 저장 실패: {}", e))?;

    Ok(())
}
