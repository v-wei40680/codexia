pub async fn delete_session_file(_project_path: String, session_path: String) -> Result<(), String> {
    std::fs::remove_file(&session_path).map_err(|e| format!("Failed to delete session: {}", e))?;

    // The cache will be updated on the next scan
    Ok(())
}

pub async fn delete_sessions_files(
    _project_path: String,
    session_paths: Vec<String>,
) -> Result<(), String> {
    for session_path in &session_paths {
        std::fs::remove_file(session_path)
            .map_err(|e| format!("Failed to delete session {}: {}", session_path, e))?;
    }

    // The cache will be updated on the next scan
    Ok(())
}
