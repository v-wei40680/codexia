use codex_client::services::{coder, codex};

#[tauri::command]
pub async fn check_codex_version() -> Result<String, String> {
    codex::check_codex_version().await
}

#[tauri::command]
pub async fn check_coder_version() -> Result<String, String> {
    coder::check_coder_version().await
}
