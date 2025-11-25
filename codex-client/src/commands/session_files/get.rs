use crate::session_files::get as codex_get;

#[tauri::command]
pub async fn get_session_files() -> Result<Vec<String>, String> {
    codex_get::get_session_files().await
}

#[tauri::command]
pub async fn read_session_file(file_path: String) -> Result<String, String> {
    codex_get::read_session_file(file_path).await
}
