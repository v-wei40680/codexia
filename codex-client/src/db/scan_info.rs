use chrono::{DateTime, Utc};
use rusqlite::{params, OptionalExtension};

use super::get_connection;

/// Get the last scanned timestamp for a project
pub(crate) fn get_last_scanned(project_path: &str) -> Result<Option<DateTime<Utc>>, String> {
    let conn = get_connection()?;

    let last_scanned: Option<String> = conn
        .query_row(
            "SELECT last_scanned FROM scan_info WHERE project_path = ?1",
            params![project_path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to query scan_info: {}", e))?;

    match last_scanned {
        Some(s) => match DateTime::parse_from_rfc3339(&s) {
            Ok(dt) => Ok(Some(dt.with_timezone(&Utc))),
            Err(_) => Ok(None),
        },
        None => Ok(None),
    }
}

/// Update the last scanned timestamp for a project
pub(crate) fn update_last_scanned(project_path: &str) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "INSERT OR REPLACE INTO scan_info (project_path, last_scanned) VALUES (?1, ?2)",
        params![project_path, Utc::now().to_rfc3339()],
    )
    .map_err(|e| format!("Failed to update scan_info: {}", e))?;

    Ok(())
}
