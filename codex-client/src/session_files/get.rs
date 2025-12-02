use super::file::get_sessions_path;
use tokio::fs::read_to_string;
use walkdir::WalkDir;

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
