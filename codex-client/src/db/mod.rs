use rusqlite::Connection;
use std::path::PathBuf;

mod sessions;
mod favorites;
mod usage;
mod scan_info;
pub mod notes;

pub use sessions::*;
pub use favorites::*;
pub use usage::read_token_usage;
pub use notes::*;
pub(crate) use scan_info::{get_last_scanned, update_last_scanned};
pub use scan_info::{get_last_global_scan, update_last_global_scan};

use chrono::{DateTime, Utc};
use serde_json::Value;

/// Get the path to the SQLite database
fn get_db_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not get home directory")?;
    let codexia_dir = home_dir.join(".codexia");
    std::fs::create_dir_all(&codexia_dir)
        .map_err(|e| format!("Failed to create .codexia directory: {}", e))?;
    Ok(codexia_dir.join("cache.db"))
}

/// Get a database connection and ensure tables exist
pub(crate) fn get_connection() -> Result<Connection, String> {
    let db_path = get_db_path()?;
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    init_tables(&conn)?;
    Ok(conn)
}

/// Initialize all database tables
fn init_tables(conn: &Connection) -> Result<(), String> {
    init_sessions_table(conn)?;
    init_favorites_table(conn)?;
    init_scan_info_table(conn)?;
    init_usage_table(conn)?;
    init_notes_table(conn)?;
    Ok(())
}

/// Create sessions table and indexes
fn init_sessions_table(conn: &Connection) -> Result<(), String> {
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
        "CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_path)",
        [],
    )
    .map_err(|e| format!("Failed to create sessions index: {}", e))?;

    Ok(())
}

/// Create favorites table and indexes
fn init_favorites_table(conn: &Connection) -> Result<(), String> {
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
        "CREATE INDEX IF NOT EXISTS idx_favorites_project ON favorites(project_path)",
        [],
    )
    .map_err(|e| format!("Failed to create favorites index: {}", e))?;

    Ok(())
}

/// Create scan_info table
fn init_scan_info_table(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS scan_info (
            project_path TEXT PRIMARY KEY,
            last_scanned TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Failed to create scan_info table: {}", e))?;

    Ok(())
}

/// Create usage table and indexes
fn init_usage_table(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL UNIQUE,
            rollout_path TEXT NOT NULL,
            project_path TEXT,
            input_tokens INTEGER NOT NULL DEFAULT 0,
            cached_input_tokens INTEGER NOT NULL DEFAULT 0,
            output_tokens INTEGER NOT NULL DEFAULT 0,
            reasoning_output_tokens INTEGER NOT NULL DEFAULT 0,
            total_tokens INTEGER NOT NULL DEFAULT 0,
            timestamp TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Failed to create usage table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage(timestamp)",
        [],
    )
    .map_err(|e| format!("Failed to create usage timestamp index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_usage_project ON usage(project_path)",
        [],
    )
    .map_err(|e| format!("Failed to create usage project index: {}", e))?;

    Ok(())
}

/// Create notes table and indexes
fn init_notes_table(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT,
            is_favorited BOOLEAN NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            synced_at TEXT
        )",
        [],
    )
    .map_err(|e| format!("Failed to create notes table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)",
        [],
    )
    .map_err(|e| format!("Failed to create notes user_id index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC)",
        [],
    )
    .map_err(|e| format!("Failed to create notes updated_at index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_notes_synced ON notes(synced_at)",
        [],
    )
    .map_err(|e| format!("Failed to create notes synced_at index: {}", e))?;

    Ok(())
}

/// Read cached sessions and favorites for a project (combined operation)
pub(crate) fn read_project_cache(project_path: &str) -> Result<Option<(DateTime<Utc>, Vec<Value>, Vec<String>)>, String> {
    let last_scanned = get_last_scanned(project_path)?;

    match last_scanned {
        Some(last_scanned) => {
            let sessions = get_sessions_by_project(project_path)?;
            let favorites = get_favorites_by_project(project_path)?;
            Ok(Some((last_scanned, sessions, favorites)))
        }
        None => Ok(None),
    }
}

/// Write sessions and favorites to the database (combined operation)
pub(crate) fn write_project_cache(
    project_path: &str,
    sessions: &[Value],
    favorites: &[String],
) -> Result<(), String> {
    update_last_scanned(project_path)?;
    upsert_sessions(project_path, sessions)?;
    update_favorites(project_path, favorites)?;
    Ok(())
}

/// Update only the favorites for a project (kept for backward compatibility)
pub fn update_project_favorites(project_path: String, favorites: Vec<String>) -> Result<(), String> {
    update_favorites(&project_path, &favorites)
}

/// Remove a session from the cache (kept for backward compatibility)
pub fn remove_project_session(project_path: String, conversation_id: String) -> Result<(), String> {
    delete_session(&project_path, &conversation_id)?;
    delete_favorite(&project_path, &conversation_id)?;
    Ok(())
}

