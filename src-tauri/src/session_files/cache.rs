use super::get::get_cache_path_for_project;
use super::scanner::{scan_sessions_after, ScanResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::fs::{read_to_string, File};
use std::io::Write;

/// Structure stored in cache file
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectCache {
    last_scanned: String,
    sessions: Vec<Value>,
    favorites: Vec<String>,
    #[serde(default)]
    scan_metadata: Option<ScanMetadata>,
}

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct ScanMetadata {
    file_names: Vec<String>,
    scanned_count: usize,
    added_count: usize,
}

struct CachedProjectData {
    last_scanned: DateTime<Utc>,
    sessions: Vec<Value>,
    favorites: Vec<String>,
    scan_metadata: Option<ScanMetadata>,
}

/// Read cache file for a project
fn read_project_cache(project_path: &str) -> Result<Option<CachedProjectData>, String> {
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
        Some(dt) => Ok(Some(CachedProjectData {
            last_scanned: dt,
            sessions: cache.sessions,
            favorites: cache.favorites,
            scan_metadata: cache.scan_metadata,
        })),
        None => Ok(None),
    }
}

fn write_project_cache_with_metadata(
    project_path: &str,
    sessions: Vec<Value>,
    favorites: Vec<String>,
    scan_metadata: Option<ScanMetadata>,
) -> Result<(), String> {
    let metadata_to_write = match scan_metadata {
        Some(meta) => Some(meta),
        None => match read_project_cache(project_path)? {
            Some(existing) => existing.scan_metadata,
            None => None,
        },
    };

    let cache_path = get_cache_path_for_project(project_path)?;
    let data = ProjectCache {
        last_scanned: Utc::now().to_rfc3339(),
        sessions,
        favorites,
        scan_metadata: metadata_to_write,
    };

    let json_str =
        serde_json::to_string_pretty(&data).map_err(|e| format!("Failed to serialize cache: {}", e))?;
    let mut file =
        File::create(&cache_path).map_err(|e| format!("Failed to create cache file: {}", e))?;
    file.write_all(json_str.as_bytes())
        .map_err(|e| format!("Failed to write cache file: {}", e))?;

    Ok(())
}

/// Write updated cache to disk
#[tauri::command]
pub fn write_project_cache(project_path: String, sessions: Vec<Value>, favorites: Vec<String>) -> Result<(), String> {
    write_project_cache_with_metadata(&project_path, sessions, favorites, None)
}

/// Main tauri command: load or refresh sessions for given project
#[tauri::command]
pub async fn load_project_sessions(project_path: String) -> Result<Value, String> {
    match read_project_cache(&project_path)? {
        Some(cache_data) => {
            // Incremental scan
            let mut cached_sessions = cache_data.sessions;
            let favorites = cache_data.favorites;
            let last_scanned = cache_data.last_scanned;

            let existing_ids: HashSet<String> = cached_sessions
                .iter()
                .filter_map(|session| session["conversationId"].as_str().map(String::from))
                .collect();

            let ScanResult {
                sessions: mut new_sessions,
                file_names,
            } = scan_sessions_after(&project_path, Some(last_scanned))?;
            let scanned_count = file_names.len();

            let added_count = new_sessions
                .iter()
                .filter(|session| {
                    session["conversationId"]
                        .as_str()
                        .map(|id| !existing_ids.contains(id))
                        .unwrap_or(true)
                })
                .count();

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

            let scan_metadata = ScanMetadata {
                file_names,
                scanned_count,
                added_count,
            };

            let metadata_for_cache = scan_metadata.clone();
            write_project_cache_with_metadata(
                &project_path,
                cached_sessions.clone(),
                favorites.clone(),
                Some(metadata_for_cache),
            )?;
            Ok(json!({
                "sessions": cached_sessions,
                "favorites": favorites,
                "scanMetadata": scan_metadata
            }))
        }
        None => {
            // No cache or broken cache → full scan
            let ScanResult { sessions, file_names } =
                scan_sessions_after(&project_path, None)?;
            let favorites: Vec<String> = Vec::new();
            let scan_metadata = ScanMetadata {
                file_names,
                scanned_count: sessions.len(),
                added_count: sessions.len(),
            };

            let metadata_for_cache = scan_metadata.clone();
            write_project_cache_with_metadata(
                &project_path,
                sessions.clone(),
                favorites.clone(),
                Some(metadata_for_cache),
            )?;
            Ok(json!({
                "sessions": sessions,
                "favorites": favorites,
                "scanMetadata": scan_metadata
            }))
        }
    }
}
