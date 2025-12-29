use serde_json::Value;

#[tauri::command]
pub async fn scan_projects() -> Result<Vec<Value>, String> {
    // Pass None to scan all files (no time filter)
    codex_client::session_files::scanner::scan_projects(None).await
}
