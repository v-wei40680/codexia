use super::file::get_sessions_path;
use super::utils::{parse_session_project_path, parse_filename_metadata};
use chrono::{DateTime, Utc};
use codex_protocol::protocol::TokenUsage;
use serde::{Deserialize, Serialize};
use std::fs::{read_to_string, File};
use std::io::Write;
use std::path::PathBuf;
use walkdir::WalkDir;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    rollout_path: String,
    project_path: Option<String>,
    session_id: String,
    usage: TokenUsage,
    timestamp: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UsageCache {
    sessions: Vec<Session>,
    user_scan_metadata: Option<UsageScanMetadata>,
    last_scanned: String,
}

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct UsageScanMetadata {
    #[serde(default)]
    scanned_count: usize,
    added_count: usize,
}

fn get_usage_cache_dir() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory".to_string())?;
    let codex_dir = home_dir.join(".codex");
    let usage_cache_dir = codex_dir.join("usage_cache");
    std::fs::create_dir_all(&usage_cache_dir)
        .map_err(|e| format!("Failed to create usage cache dir: {}", e))?;
    Ok(usage_cache_dir)
}

fn get_usage_cache_path() -> Result<PathBuf, String> {
    Ok(get_usage_cache_dir()?.join("usage.json"))
}

fn read_usage_cache() -> Result<Option<UsageCache>, String> {
    let cache_path = get_usage_cache_path()?;
    if !cache_path.exists() {
        return Ok(None);
    }

    let cache_str =
        read_to_string(&cache_path).map_err(|e| format!("Failed to read usage cache: {}", e))?;

    let cache: UsageCache = match serde_json::from_str(&cache_str) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Usage cache parse failed ({}), fallback to empty cache.", e);
            return Ok(None); // fallback gracefully
        }
    };
    Ok(Some(cache))
}

fn write_usage_cache(cache: UsageCache) -> Result<(), String> {
    let cache_path = get_usage_cache_path()?;
    let json_str = serde_json::to_string_pretty(&cache)
        .map_err(|e| format!("Failed to serialize usage cache: {}", e))?;
    let mut file = File::create(&cache_path)
        .map_err(|e| format!("Failed to create usage cache file: {}", e))?;
    file.write_all(json_str.as_bytes())
        .map_err(|e| format!("Failed to write usage cache file: {}", e))?;
    Ok(())
}

fn scan_usage_files_after(
    last_scanned: Option<DateTime<Utc>>,
) -> Result<Vec<Session>, String> {
    let sessions_dir = get_sessions_path()?;
    let mut usage_vec: Vec<Session> = Vec::new();

    for entry in WalkDir::new(&sessions_dir)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "jsonl") {
            let file_name = path
                .file_name()
                .and_then(|s| s.to_str())
                .ok_or_else(|| format!("Invalid file name for {:?}", path))?;

            let (file_timestamp, uuid_str) = parse_filename_metadata(file_name)?;

            if let Some(last_scanned_dt) = last_scanned {
                if file_timestamp <= last_scanned_dt {
                    continue; // Skip files older than or equal to last_scanned
                }
            }

            let file_content = read_to_string(path)
                .map_err(|e| format!("Failed to read session file {:?}: {}", path, e))?;

            let project_path = file_content.lines().next().and_then(parse_session_project_path);

            let mut current_file_usage = TokenUsage::default();

            for line in file_content.lines() {
                let event: serde_json::Value = match serde_json::from_str(line) {
                    Ok(v) => v,
                    Err(_) => continue, // Skip malformed JSON lines
                };
            
                if let Some(payload) = event.get("payload") {
                    if let Some(payload_type) = payload.get("type").and_then(|t| t.as_str()) {
                        if payload_type == "token_count" {
                            if let Some(info) = payload.get("info") {
                                if !info.is_null() {
                                    if let Some(total_token_usage) = info.get("total_token_usage") {
                                        if let Ok(usage) =
                                            serde_json::from_value::<TokenUsage>(total_token_usage.clone())
                                        {
                                            // Only update if valid
                                            if usage.input_tokens > 0 {
                                                current_file_usage = usage;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // Only add if we found some usage in this file
            if current_file_usage.input_tokens != 0 {
                let session = Session {
                    rollout_path: path.to_string_lossy().to_string(),
                    project_path,
                    session_id: uuid_str,
                    usage: current_file_usage,
                    timestamp: file_timestamp,
                };
                usage_vec.push(session);
            }
        }
    }
    Ok(usage_vec)
}

pub async fn read_token_usage() -> Result<Vec<Session>, String> {
    let mut usage_cache = match read_usage_cache()? {
        Some(cache) => cache,
        None => UsageCache {
            sessions: Vec::new(),
            user_scan_metadata: None,
            last_scanned: "1970-01-01T00:00:00Z".to_string(),
        },
    };

    let last_scanned_dt = DateTime::parse_from_rfc3339(&usage_cache.last_scanned)
        .map_err(|e| format!("Failed to parse last_scanned timestamp: {}", e))?
        .with_timezone(&Utc);
    
    println!("last_scanned_dt {:?}", last_scanned_dt);

    let new_usage_list = if usage_cache.sessions.is_empty() {
        scan_usage_files_after(None)?
    } else {
        scan_usage_files_after(Some(last_scanned_dt))?
    };
    println!("new_usage_list {:?}", new_usage_list);

    usage_cache.sessions.extend(new_usage_list);

    usage_cache.last_scanned = Utc::now().to_rfc3339();
    write_usage_cache(usage_cache.clone())?;

    Ok(usage_cache.sessions)
}
