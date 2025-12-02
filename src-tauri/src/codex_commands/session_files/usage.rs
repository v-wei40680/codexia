use codex_client::session_files::usage::Session;

#[tauri::command]
pub async fn read_token_usage() -> Result<Vec<Session>, String> {
    codex_client::session_files::usage::read_token_usage().await
}
