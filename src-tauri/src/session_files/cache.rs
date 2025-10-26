use super::get::get_cache_path_for_project;
use super::scanner::scan_sessions_after;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs::{read_to_string, File};
use std::io::Write;

/// Structure stored in cache file
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectCache {
    last_scanned: String,
    sessions: Vec<Value>,
    favorites: Vec<String>,
}

/// Read cache file for a project
fn read_project_cache(project_path: &str) -> Result<Option<(DateTime<Utc>, Vec<Value>, Vec<String>)>, String> {
    let cache_path = get_cache_path_for_project(project_path)?;
    if !cache_path.exists() {
        return Ok(None);
    }

    let cache_str =
        read_to_string(&cache_path).map_err(|e| format!("Failed to read cache: {}", e))?;

    let cache: ProjectCache = match serde_json::from_str(&cache_str) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Cache parse failed ({}), fallback to full scan.", e);
            return Ok(None); // fallback gracefully
        }
    };

    let last_scanned = DateTime::parse_from_rfc3339(&cache.last_scanned)
        .ok()
        .map(|dt| dt.with_timezone(&Utc));

    match last_scanned {
        Some(dt) => Ok(Some((dt, cache.sessions, cache.favorites))),
        None => Ok(None),
    }
}

/// Write updated cache to disk
#[tauri::command]
pub fn write_project_cache(project_path: String, sessions: Vec<Value>, favorites: Vec<String>) -> Result<(), String> {
    let cache_path = get_cache_path_for_project(&project_path)?;
    let data = ProjectCache {
        last_scanned: Utc::now().to_rfc3339(),
        sessions,
        favorites,
    };

    let json_str =
        serde_json::to_string_pretty(&data).map_err(|e| format!("Failed to serialize cache: {}", e))?;
    let mut file =
        File::create(&cache_path).map_err(|e| format!("Failed to create cache file: {}", e))?;
    file.write_all(json_str.as_bytes())
        .map_err(|e| format!("Failed to write cache file: {}", e))?;

    Ok(())
}

/// Main tauri command: load or refresh sessions for given project
#[tauri::command]
pub async fn load_project_sessions(project_path: String) -> Result<Value, String> {
    match read_project_cache(&project_path)? {
        Some((last_scanned, mut cached_sessions, favorites)) => {
            // Incremental scan
            let new_sessions = scan_sessions_after(&project_path, Some(last_scanned))?;

            // Deduplicate by conversationId
            let new_ids: std::collections::HashSet<_> = new_sessions
                .iter()
                .filter_map(|s| s["conversationId"].as_str())
                .collect();

            cached_sessions.retain(|s| {
                !new_ids.contains(s["conversationId"].as_str().unwrap_or_default())
            });

            cached_sessions.extend(new_sessions);

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

            write_project_cache(project_path.clone(), cached_sessions.clone(), favorites.clone())?;
            Ok(json!({ "sessions": cached_sessions, "favorites": favorites }))
        }
        None => {
            // No cache or broken cache → full scan
            let sessions = scan_sessions_after(&project_path, None)?;
            let favorites: Vec<String> = Vec::new();
            write_project_cache(project_path.clone(), sessions.clone(), favorites.clone())?;
            Ok(json!({ "sessions": sessions, "favorites": favorites }))
        }
    }
}
