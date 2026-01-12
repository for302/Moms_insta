mod commands;
mod error;
mod models;
mod services;

use commands::{content, image, keyword, project, research, settings};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // Keyword commands
            keyword::suggest_keywords,
            // Research commands
            research::search_papers,
            research::analyze_ingredient,
            research::search_web,
            research::search_conferences,
            research::search_news,
            // Content commands
            content::generate_content_plan,
            content::create_persona,
            // Image commands
            image::generate_image,
            image::generate_batch_images,
            image::download_image,
            image::download_all_images,
            // Settings commands
            settings::get_settings,
            settings::save_settings,
            settings::save_api_keys,
            settings::get_save_path,
            settings::set_save_path,
            settings::validate_openai_key,
            settings::validate_anthropic_key,
            settings::validate_google_key,
            settings::generate_preview_image,
            settings::save_image_prompt,
            settings::delete_image_prompt,
            settings::save_layout_settings,
            settings::generate_prompt_from_image,
            settings::get_system_fonts,
            settings::delete_image_file,
            settings::open_folder_in_explorer,
            // Project commands
            project::create_project,
            project::load_project,
            project::save_project,
            project::delete_project,
            project::list_projects,
            project::save_research_item,
            project::save_content_group,
            project::get_project_images_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
