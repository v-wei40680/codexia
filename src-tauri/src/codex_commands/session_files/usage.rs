use serde_json::Value;

#[tauri::command]
pub async fn read_token_usage() -> Result<Vec<Value>, String> {
    codex_client::session_files::usage::read_token_usage().await
}
