use rusqlite::params;
use serde_json::{json, Value};

use super::get_connection;

/// Read sessions for a specific project
pub(crate) fn get_sessions_by_project(project_path: &str) -> Result<Vec<Value>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare("SELECT conversation_id, path, preview, timestamp, source FROM sessions WHERE project_path = ?1")
        .map_err(|e| format!("Failed to prepare sessions query: {}", e))?;

    let sessions: Result<Vec<Value>, String> = stmt
        .query_map(params![project_path], |row| {
            let conversation_id: String = row.get(0)?;
            let path: String = row.get(1)?;
            let preview: Option<String> = row.get(2)?;
            let timestamp: Option<String> = row.get(3)?;
            let source: Option<String> = row.get(4)?;

            Ok(json!({
                "conversationId": conversation_id,
                "path": path,
                "preview": preview,
                "timestamp": timestamp,
                "source": source.unwrap_or_default(),
            }))
        })
        .map_err(|e| format!("Failed to query sessions: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect sessions: {}", e));

    sessions
}

/// Insert or update multiple sessions for a project
pub(crate) fn upsert_sessions(project_path: &str, sessions: &[Value]) -> Result<(), String> {
    let conn = get_connection()?;

    // Clear existing sessions for this project
    conn.execute(
        "DELETE FROM sessions WHERE project_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to delete old sessions: {}", e))?;

    // Insert sessions
    for session in sessions {
        let conversation_id = session["conversationId"].as_str().unwrap_or("");
        let path = session["path"].as_str().unwrap_or("");
        let preview = session["preview"].as_str();
        let timestamp = session["timestamp"].as_str();
        let source = session["source"].as_str();

        conn.execute(
            "INSERT OR REPLACE INTO sessions (project_path, conversation_id, path, preview, timestamp, source)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![project_path, conversation_id, path, preview, timestamp, source],
        )
        .map_err(|e| format!("Failed to insert session: {}", e))?;
    }

    Ok(())
}

/// Delete a specific session
pub fn delete_session(project_path: &str, conversation_id: &str) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "DELETE FROM sessions WHERE project_path = ?1 AND conversation_id = ?2",
        params![project_path, conversation_id],
    )
    .map_err(|e| format!("Failed to delete session: {}", e))?;

    Ok(())
}

/// Update the preview/title of a session
pub fn update_session_preview(
    project_path: &str,
    session_path: &str,
    preview: &str,
) -> Result<(), String> {
    let conn = get_connection()?;

    let truncated_text: String = preview.chars().take(50).collect();

    conn.execute(
        "UPDATE sessions SET preview = ?1 WHERE project_path = ?2 AND path = ?3",
        params![truncated_text, project_path, session_path],
    )
    .map_err(|e| format!("Failed to update session preview: {}", e))?;

    Ok(())
}
