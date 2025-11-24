use crate::codex::services::coder;
use crate::codex::services::codex;

#[tauri::command]
pub async fn check_codex_version() -> Result<String, String> {
    codex::check_codex_version().await
}

#[tauri::command]
pub async fn check_coder_version() -> Result<String, String> {
    coder::check_coder_version().await
}
