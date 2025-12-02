#[tauri::command]
pub async fn delete_session_file(
    project_path: String,
    session_path: String,
) -> Result<(), String> {
    codex_client::session_files::delete::delete_session_file(project_path, session_path).await
}

#[tauri::command]
pub async fn delete_sessions_files(
    project_path: String,
    session_paths: Vec<String>,
) -> Result<(), String> {
    codex_client::session_files::delete::delete_sessions_files(project_path, session_paths).await
}
