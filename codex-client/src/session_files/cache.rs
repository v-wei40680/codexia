use super::scanner::{scan_sessions_after, ScanResult};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::path::PathBuf;

/// Get the path to the SQLite database
fn get_db_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not get home directory")?;
    let codexia_dir = home_dir.join(".codexia");
    std::fs::create_dir_all(&codexia_dir)
        .map_err(|e| format!("Failed to create .codexia directory: {}", e))?;
    Ok(codexia_dir.join("cache.db"))
}

/// Get a database connection and ensure tables exist
fn get_connection() -> Result<Connection, String> {
    let db_path = get_db_path()?;
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Create tables if they don't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_path TEXT NOT NULL,
            conversation_id TEXT NOT NULL,
            path TEXT NOT NULL,
            preview TEXT,
            timestamp TEXT,
            source TEXT,
            last_modified INTEGER,
            UNIQUE(project_path, conversation_id)
        )",
        [],
    )
    .map_err(|e| format!("Failed to create sessions table: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_path TEXT NOT NULL,
            conversation_id TEXT NOT NULL,
            UNIQUE(project_path, conversation_id)
        )",
        [],
    )
    .map_err(|e| format!("Failed to create favorites table: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS scan_info (
            project_path TEXT PRIMARY KEY,
            last_scanned TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Failed to create scan_info table: {}", e))?;

    // Create indexes for better performance
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_path)",
        [],
    )
    .map_err(|e| format!("Failed to create index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_favorites_project ON favorites(project_path)",
        [],
    )
    .map_err(|e| format!("Failed to create index: {}", e))?;

    Ok(conn)
}

/// Read cached sessions and favorites for a project
fn read_project_cache(project_path: &str) -> Result<Option<(DateTime<Utc>, Vec<Value>, Vec<String>)>, String> {
    let conn = get_connection()?;

    // Get last scanned time
    let last_scanned: Option<String> = conn
        .query_row(
            "SELECT last_scanned FROM scan_info WHERE project_path = ?1",
            params![project_path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query scan_info: {}", e))?;

    let last_scanned = match last_scanned {
        Some(s) => match DateTime::parse_from_rfc3339(&s) {
            Ok(dt) => dt.with_timezone(&Utc),
            Err(_) => return Ok(None),
        },
        None => return Ok(None),
    };

    // Get sessions
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

    let sessions = sessions?;

    // Get favorites
    let mut stmt = conn
        .prepare("SELECT conversation_id FROM favorites WHERE project_path = ?1")
        .map_err(|e| format!("Failed to prepare favorites query: {}", e))?;

    let favorites: Result<Vec<String>, String> = stmt
        .query_map(params![project_path], |row| row.get(0))
        .map_err(|e| format!("Failed to query favorites: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect favorites: {}", e));

    let favorites = favorites?;

    Ok(Some((last_scanned, sessions, favorites)))
}

/// Write sessions and favorites to the database
fn write_project_cache(
    project_path: &str,
    sessions: &[Value],
    favorites: &[String],
) -> Result<(), String> {
    let conn = get_connection()?;

    // Update last_scanned
    conn.execute(
        "INSERT OR REPLACE INTO scan_info (project_path, last_scanned) VALUES (?1, ?2)",
        params![project_path, Utc::now().to_rfc3339()],
    )
    .map_err(|e| format!("Failed to update scan_info: {}", e))?;

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

    // Clear existing favorites for this project
    conn.execute(
        "DELETE FROM favorites WHERE project_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to delete old favorites: {}", e))?;

    // Insert favorites
    for favorite in favorites {
        conn.execute(
            "INSERT OR IGNORE INTO favorites (project_path, conversation_id) VALUES (?1, ?2)",
            params![project_path, favorite],
        )
        .map_err(|e| format!("Failed to insert favorite: {}", e))?;
    }

    Ok(())
}

/// Update only the favorites for a project
pub fn update_project_favorites(project_path: String, favorites: Vec<String>) -> Result<(), String> {
    let conn = get_connection()?;

    // Clear existing favorites for this project
    conn.execute(
        "DELETE FROM favorites WHERE project_path = ?1",
        params![&project_path],
    )
    .map_err(|e| format!("Failed to delete old favorites: {}", e))?;

    // Insert new favorites
    for favorite in favorites {
        conn.execute(
            "INSERT OR IGNORE INTO favorites (project_path, conversation_id) VALUES (?1, ?2)",
            params![&project_path, &favorite],
        )
        .map_err(|e| format!("Failed to insert favorite: {}", e))?;
    }

    Ok(())
}

/// Remove a session from the cache
pub fn remove_project_session(project_path: String, conversation_id: String) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "DELETE FROM sessions WHERE project_path = ?1 AND conversation_id = ?2",
        params![&project_path, &conversation_id],
    )
    .map_err(|e| format!("Failed to delete session: {}", e))?;

    conn.execute(
        "DELETE FROM favorites WHERE project_path = ?1 AND conversation_id = ?2",
        params![&project_path, &conversation_id],
    )
    .map_err(|e| format!("Failed to delete favorite: {}", e))?;

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

/// Main tauri command: load or refresh sessions for given project
pub async fn load_project_sessions(project_path: String) -> Result<Value, String> {
    match read_project_cache(&project_path)? {
        Some((last_scanned, mut cached_sessions, favorites)) => {
            // Incremental scan
            let ScanResult {
                sessions: mut new_sessions,
            } = scan_sessions_after(&project_path, Some(last_scanned))?;

            let new_ids: HashSet<String> = new_sessions
                .iter()
                .filter_map(|session| session["conversationId"].as_str().map(String::from))
                .collect();

            // Deduplicate by conversationId
            cached_sessions.retain(|s| {
                s["conversationId"]
                    .as_str()
                    .map(|id| !new_ids.contains(id))
                    .unwrap_or(true)
            });

            cached_sessions.append(&mut new_sessions);

            // Sort newest first
            cached_sessions.sort_by(|a, b| {
                use super::utils::extract_datetime;
                let a_dt = extract_datetime(a["path"].as_str().unwrap_or_default());
                let b_dt = extract_datetime(b["path"].as_str().unwrap_or_default());
                match (a_dt, b_dt) {
                    (Some(a_dt), Some(b_dt)) => b_dt.cmp(&a_dt),
                    (Some(_), None) => std::cmp::Ordering::Less,
                    (None, Some(_)) => std::cmp::Ordering::Greater,
                    (None, None) => a["path"].as_str().cmp(&b["path"].as_str()),
                }
            });

            write_project_cache(&project_path, &cached_sessions, &favorites)?;

            Ok(json!({
                "sessions": cached_sessions,
                "favorites": favorites,
            }))
        }
        None => {
            // No cache or broken cache → full scan
            let ScanResult { sessions } = scan_sessions_after(&project_path, None)?;
            let favorites: Vec<String> = Vec::new();

            write_project_cache(&project_path, &sessions, &favorites)?;

            Ok(json!({
                "sessions": sessions,
                "favorites": favorites,
            }))
        }
    }
}
