use codex_client::session_files::update as codex_update;

#[tauri::command]
pub async fn update_cache_title(
    project_path: String,
    session_path: String,
    preview: String,
) -> Result<(), String> {
    codex_update::update_cache_title(project_path, session_path, preview).await
}
