use base64::engine::general_purpose;
use base64::engine::Engine as _;
use std::path::PathBuf;
use walkdir::WalkDir;

use super::file::get_sessions_path;
use tokio::fs::read_to_string;

pub fn get_cache_dir() -> Result<PathBuf, String> {
    let sessions_dir = get_sessions_path()?;
    let cache_dir = sessions_dir
        .parent()
        .ok_or("Could not get parent of sessions directory")?
        .join("scan_cache");
    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create cache dir: {}", e))?;
    Ok(cache_dir)
}

pub fn get_cache_path_for_project(project_path: &str) -> Result<PathBuf, String> {
    let encoded = general_purpose::STANDARD.encode(project_path);
    Ok(get_cache_dir()?.join(format!("{}.json", encoded)))
}

pub async fn get_session_files() -> Result<Vec<String>, String> {
    let sessions_dir = get_sessions_path()?;
    let mut files = Vec::new();

    for entry in WalkDir::new(&sessions_dir)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "jsonl") {
            files.push(path.to_string_lossy().into_owned());
        }
    }
    Ok(files)
}

pub async fn read_session_file(file_path: String) -> Result<String, String> {
    read_to_string(&file_path)
        .await
        .map_err(|e| format!("Failed to read session file: {}", e))
}
