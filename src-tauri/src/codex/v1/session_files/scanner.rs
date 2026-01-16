use super::file::{get_session_info, get_sessions_path, read_first_line};
use super::utils::{count_lines, extract_datetime, parse_session_project_path};
use chrono::{DateTime, NaiveDateTime, Utc};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::path::Path;
use walkdir::WalkDir;

/// Result of a scan operation
pub struct ScanResult {
    pub sessions: Vec<Value>,
}

/// Walk through all `.jsonl` files in sessions directory
pub fn scan_jsonl_files<P: AsRef<Path>>(dir_path: P) -> impl Iterator<Item = walkdir::DirEntry> {
    WalkDir::new(dir_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("jsonl"))
}

/// Scan sessions incrementally — only include files modified after cutoff
pub fn scan_sessions_after(
    project_path: &str,
    after: Option<DateTime<Utc>>,
) -> Result<ScanResult, String> {
    let sessions_dir = get_sessions_path()?;
    let mut sessions = Vec::new();

    for entry in scan_jsonl_files(&sessions_dir) {
        let path = entry.path();

        // Skip unmodified files
        if let Some(cutoff) = after {
            if let Ok(metadata) = std::fs::metadata(path) {
                if let Ok(modified) = metadata.modified() {
                    let modified_datetime: DateTime<Utc> = modified.into();
                    if modified_datetime <= cutoff {
                        continue;
                    }
                }
            }
        }

        let file_path = path.to_string_lossy().to_string();

        // Read first line and parse JSON once
        match read_first_line(path) {
            Ok(line) => {
                // Parse JSON once to extract both project path and source
                if let Ok(json_value) = serde_json::from_str::<Value>(&line) {
                    if let Some(cwd) = json_value["payload"]["cwd"].as_str() {
                        if cwd == project_path {
                            if let Ok(info) = get_session_info(path) {
                                let original_text = info.user_message.unwrap_or_default();
                                let truncated_text: String = original_text.chars().take(50).collect();
                                let source = json_value["payload"]["source"]
                                    .as_str()
                                    .unwrap_or_default()
                                    .to_string();
                                sessions.push(json!({
                                    "path": file_path,
                                    "conversationId": info.session_id,
                                    "preview": truncated_text,
                                    "source": source
                                }));
                            }
                        }
                    }
                } else {
                    eprintln!("Could not extract project path from first line of {:?}", path);
                }
            }
            Err(e) => eprintln!("Failed to read first line: {}", e),
        }
    }

    // Pre-compute datetime and timestamp for efficient sorting
    let mut sessions_with_datetime: Vec<(Value, Option<NaiveDateTime>, String)> = sessions
        .into_iter()
        .map(|mut session| {
            let path_str = session["path"].as_str().unwrap_or_default().to_string();
            let datetime = extract_datetime(&path_str);
            let timestamp = datetime
                .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S").to_string())
                .unwrap_or_default();
            session["timestamp"] = Value::String(timestamp.clone());
            (session, datetime, path_str)
        })
        .collect();

    // Sort newest first using pre-computed datetime
    sessions_with_datetime.sort_by(|a, b| {
        match (&a.1, &b.1) {
            (Some(a_dt), Some(b_dt)) => b_dt.cmp(a_dt),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => a.2.cmp(&b.2),
        }
    });

    let sessions: Vec<Value> = sessions_with_datetime.into_iter().map(|(s, _, _)| s).collect();

    Ok(ScanResult {
        sessions,
    })
}

/// Scan all projects that appear in sessions folder
/// Only scans files modified after the given cutoff time to improve performance
pub async fn scan_projects(after: Option<DateTime<Utc>>) -> Result<Vec<Value>, String> {
    let sessions_dir = get_sessions_path()?;
    let mut unique_projects = HashSet::new();

    for entry in scan_jsonl_files(&sessions_dir) {
        let file_path = entry.path().to_path_buf();

        // Skip files not modified after cutoff time
        if let Some(cutoff) = after {
            if let Ok(metadata) = std::fs::metadata(&file_path) {
                if let Ok(modified) = metadata.modified() {
                    let modified_datetime: DateTime<Utc> = modified.into();
                    if modified_datetime <= cutoff {
                        continue;
                    }
                }
            }
        }

        // Filter out invalid small files
        match count_lines(&file_path) {
            Ok(line_count) if line_count < 4 => {
                eprintln!("Deleting file with {} lines: {:?}", line_count, file_path);
                if let Err(e) = std::fs::remove_file(&file_path) {
                    eprintln!("Failed to delete file {:?}: {}", file_path, e);
                }
                continue;
            }
            Ok(_) => {}
            Err(e) => {
                eprintln!("Failed to count lines for {:?}: {}", file_path, e);
                continue;
            }
        }

        match read_first_line(&file_path) {
            Ok(line) => match parse_session_project_path(&line) {
                Some(cwd) => { unique_projects.insert(cwd); }
                None => eprintln!("Could not extract project path from first line of {:?}", file_path),
            },
            Err(e) => eprintln!("Failed to read first line for {:?}: {}", file_path, e),
        }
    }

    let results: Vec<Value> = unique_projects
        .into_iter()
        .map(|path| {
            json!({
                "path": path,
                "trust_level": "no",
            })
        })
        .collect();

    Ok(results)
}
