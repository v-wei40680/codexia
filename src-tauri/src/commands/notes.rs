use crate::db;
use crate::db::notes::Note;

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
pub async fn toggle_favorite(id: String) -> Result<(), String> {
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
