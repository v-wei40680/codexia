use codex_client::session_files::ScannedProject;

#[tauri::command]
pub async fn get_scanned_projects() -> Result<Vec<ScannedProject>, String> {
    codex_client::session_files::read_scanned_projects().await
}

#[tauri::command]
pub async fn scan_and_cache_projects() -> Result<Vec<ScannedProject>, String> {
    codex_client::session_files::scan_and_cache_projects().await
}
