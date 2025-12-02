use serde_json::Value;

use crate::session_files::cache as codex_cache;

#[tauri::command]
pub fn update_project_favorites(project_path: String, favorites: Vec<String>) -> Result<(), String> {
    codex_cache::update_project_favorites(project_path, favorites)
}

#[tauri::command]
pub fn remove_project_session(
    project_path: String,
    conversation_id: String,
) -> Result<(), String> {
    codex_cache::remove_project_session(project_path, conversation_id)
}

#[tauri::command]
pub async fn load_project_sessions(project_path: String) -> Result<Value, String> {
    codex_cache::load_project_sessions(project_path).await
}
