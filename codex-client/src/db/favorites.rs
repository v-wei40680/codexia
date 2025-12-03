use rusqlite::params;

use super::get_connection;

/// Get all favorite conversation IDs for a project
pub(crate) fn get_favorites_by_project(project_path: &str) -> Result<Vec<String>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare("SELECT conversation_id FROM favorites WHERE project_path = ?1")
        .map_err(|e| format!("Failed to prepare favorites query: {}", e))?;

    let favorites: Result<Vec<String>, String> = stmt
        .query_map(params![project_path], |row| row.get(0))
        .map_err(|e| format!("Failed to query favorites: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect favorites: {}", e));

    favorites
}

/// Update favorites for a project (replaces all existing favorites)
pub fn update_favorites(project_path: &str, favorites: &[String]) -> Result<(), String> {
    let conn = get_connection()?;

    // Clear existing favorites for this project
    conn.execute(
        "DELETE FROM favorites WHERE project_path = ?1",
        params![project_path],
    )
    .map_err(|e| format!("Failed to delete old favorites: {}", e))?;

    // Insert new favorites
    for favorite in favorites {
        conn.execute(
            "INSERT OR IGNORE INTO favorites (project_path, conversation_id) VALUES (?1, ?2)",
            params![project_path, favorite],
        )
        .map_err(|e| format!("Failed to insert favorite: {}", e))?;
    }

    Ok(())
}

/// Delete a favorite for a specific conversation
pub fn delete_favorite(project_path: &str, conversation_id: &str) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "DELETE FROM favorites WHERE project_path = ?1 AND conversation_id = ?2",
        params![project_path, conversation_id],
    )
    .map_err(|e| format!("Failed to delete favorite: {}", e))?;

    Ok(())
}
