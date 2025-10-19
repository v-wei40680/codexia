use std::fs;

#[tauri::command]
pub async fn delete_session_file(file_path: String) -> Result<(), String> {
    fs::remove_file(&file_path).map_err(|e| format!("Failed to delete file '{}': {}", file_path, e))
}
