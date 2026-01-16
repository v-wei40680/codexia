use crate::codex;
use crate::codex::v1::session_files::ScannedProject;
use crate::codex::v1::{db, Note, session_files};
use serde_json::Value;

#[tauri::command]
pub fn update_project_favorites(
    project_path: String,
    favorites: Vec<String>,
) -> Result<(), String> {
    db::update_project_favorites(project_path, favorites)
}

#[tauri::command]
pub fn remove_project_session(
    project_path: String,
    conversation_id: String,
) -> Result<(), String> {
    db::remove_project_session(project_path, conversation_id)
}

#[tauri::command]
pub async fn load_project_sessions(
    project_path: String,
    limit: Option<usize>,
    offset: Option<usize>,
    search_query: Option<String>,
) -> Result<Value, String> {
    session_files::load_project_sessions(project_path, limit, offset, search_query).await
}

#[tauri::command]
pub async fn create_note(
    id: String,
    user_id: Option<String>,
    title: String,
    content: String,
    tags: Option<Vec<String>>,
) -> Result<Note, String> {
    db::create_note(id, user_id, title, content, tags)
}

#[tauri::command]
pub async fn get_notes(user_id: Option<String>) -> Result<Vec<Note>, String> {
    db::get_notes(user_id)
}

#[tauri::command]
pub async fn get_note_by_id(id: String) -> Result<Option<Note>, String> {
    db::get_note_by_id(id)
}

#[tauri::command]
pub async fn update_note(
    id: String,
    title: Option<String>,
    content: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<(), String> {
    db::update_note(id, title, content, tags)
}

#[tauri::command]
pub async fn delete_note(id: String) -> Result<(), String> {
    db::delete_note(id)
}

#[tauri::command]
pub async fn toggle_note_favorite(id: String) -> Result<(), String> {
    db::toggle_favorite(id)
}

#[tauri::command]
pub async fn mark_notes_synced(ids: Vec<String>) -> Result<(), String> {
    db::mark_notes_synced(ids)
}

#[tauri::command]
pub async fn get_unsynced_notes(user_id: Option<String>) -> Result<Vec<Note>, String> {
    db::get_unsynced_notes(user_id)
}

#[tauri::command]
pub async fn scan_projects() -> Result<Vec<Value>, String> {
    // Pass None to scan all files (no time filter)
    session_files::scanner::scan_projects(None).await
}
#[tauri::command]
pub async fn update_cache_title(
    project_path: String,
    session_path: String,
    preview: String,
) -> Result<(), String> {
    db::update_session_preview(&project_path, &session_path, &preview)
}

#[tauri::command]
pub async fn read_token_usage() -> Result<Vec<Value>, String> {
    db::read_token_usage().await
}

#[tauri::command]
pub async fn get_scanned_projects() -> Result<Vec<ScannedProject>, String> {
    codex::v1::session_files::read_scanned_projects().await
}

#[tauri::command]
pub async fn scan_and_cache_projects() -> Result<Vec<ScannedProject>, String> {
    codex::v1::session_files::scan_and_cache_projects().await
}
