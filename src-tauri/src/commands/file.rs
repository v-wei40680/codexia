use log::{error, info, warn};
use std::path::PathBuf;

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        warn!("delete_file invoked with empty path");
        return Err("Path is empty.".to_string());
    }

    info!("Deleting conversation file {}", trimmed);
    let path_buf = PathBuf::from(trimmed);
    tokio::fs::remove_file(path_buf)
        .await
        .map_err(|err| {
            error!("Failed to delete file {trimmed}: {err}");
            format!("Failed to delete file: {err}")
        })
}
