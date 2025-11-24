use serde_json::Value;

use codex_client::session_files::scanner as codex_scanner;

#[tauri::command]
pub async fn scan_projects() -> Result<Vec<Value>, String> {
    codex_scanner::scan_projects().await
}
