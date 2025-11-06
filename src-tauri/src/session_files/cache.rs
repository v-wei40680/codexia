use super::get::get_cache_path_for_project;
use super::scanner::{scan_sessions_after, ScanResult};
use chrono::{DateTime, Utc};
use base64::engine::general_purpose;
use base64::engine::Engine as _;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::fs::{read_to_string, File};
use std::io::Write;
use std::path::Path;

/// Structure stored in cache file
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectCache {
    last_scanned: String,
    sessions: Vec<Value>,
    favorites: Vec<String>,
    #[serde(default)]
    scan_metadata: Option<ScanMetadata>,
    #[serde(default)]
    last10_sessions: Vec<Value>,
}

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct ScanMetadata {
    #[serde(default)]
    cache_path_name: String,
    scanned_count: usize,
    added_count: usize,
}

struct CachedProjectData {
    last_scanned: DateTime<Utc>,
    sessions: Vec<Value>,
    favorites: Vec<String>,
    scan_metadata: Option<ScanMetadata>,
    last10_sessions: Vec<Value>,
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
            last10_sessions: cache.last10_sessions,
        })),
        None => Ok(None),
    }
}

fn write_project_cache_with_metadata(
    project_path: &str,
    sessions: Vec<Value>,
    favorites: Vec<String>,
    last10_sessions: Vec<Value>,
    scan_metadata: Option<ScanMetadata>,
) -> Result<(), String> {
    let cache_path = get_cache_path_for_project(project_path)?;
    let decoded_cache_name = decode_cache_file_name(&cache_path)?;

    let metadata_to_write = match scan_metadata {
        Some(mut meta) => {
            if meta.cache_path_name.is_empty() {
                meta.cache_path_name = decoded_cache_name.clone();
            }
            Some(meta)
        }
        None => match read_project_cache(project_path)? {
            Some(existing) => existing.scan_metadata.map(|mut meta| {
                if meta.cache_path_name.is_empty() {
                    meta.cache_path_name = decoded_cache_name.clone();
                }
                meta
            }),
            None => None,
        },
    };

    let data = ProjectCache {
        last_scanned: Utc::now().to_rfc3339(),
        sessions,
        favorites,
        last10_sessions,
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
    write_project_cache_with_metadata(&project_path, sessions, favorites, Vec::new(), None)
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
            let last10_sessions = cache_data.last10_sessions;

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

            let added_count = new_sessions.len();
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

            let last10_sessions: Vec<Value> = cached_sessions.iter().take(10).cloned().collect();

            let cache_path = get_cache_path_for_project(&project_path)?;
            let cache_path_name = decode_cache_file_name(&cache_path)?;
            let scan_metadata = ScanMetadata {
                scanned_count: cached_sessions.len(),
                added_count,
                cache_path_name,
            };

            let metadata_for_cache = scan_metadata.clone();
            write_project_cache_with_metadata(
                &project_path,
                cached_sessions.clone(),
                favorites.clone(),
                last10_sessions.clone(),
                Some(metadata_for_cache),
            )?;
            Ok(json!({
                "sessions": cached_sessions,
                "favorites": favorites,
                "scanMetadata": scan_metadata,
                "last10Sessions": last10_sessions
            }))
        }
        None => {
            // No cache or broken cache → full scan
            let ScanResult { sessions } = scan_sessions_after(&project_path, None)?;
            let favorites: Vec<String> = Vec::new();
            let cache_path = get_cache_path_for_project(&project_path)?;
            let cache_path_name = decode_cache_file_name(&cache_path)?;
            let scan_metadata = ScanMetadata {
                scanned_count: sessions.len(),
                added_count: sessions.len(),
                cache_path_name,
            };

            let metadata_for_cache = scan_metadata.clone();
            write_project_cache_with_metadata(
                &project_path,
                sessions.clone(),
                favorites.clone(),
                Vec::new(), // last10_sessions will be empty on a full scan
                Some(metadata_for_cache),
            )?;
            Ok(json!({
                "sessions": sessions,
                "favorites": favorites,
                "scanMetadata": scan_metadata,
                "last10Sessions": Vec::<Value>::new()
            }))
        }
    }
}

fn decode_cache_file_name(cache_path: &Path) -> Result<String, String> {
    let encoded_stem = cache_path
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or_else(|| "Failed to read cache file name".to_string())?;
    let decoded_bytes = general_purpose::STANDARD
        .decode(encoded_stem)
        .map_err(|e| format!("Failed to decode cache file name: {}", e))?;
    String::from_utf8(decoded_bytes)
        .map_err(|e| format!("Cache file name is not valid UTF-8: {}", e))
}
