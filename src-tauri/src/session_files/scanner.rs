use super::file::{get_session_info, get_sessions_path, read_first_line};
use super::utils::{count_lines, extract_datetime};
use chrono::{DateTime, Utc};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::path::Path;
use walkdir::WalkDir;

/// Result of a scan operation
pub struct ScanResult {
    pub sessions: Vec<Value>,
    pub file_names: Vec<String>,
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

        // Read first line and parse JSON
        match read_first_line(path) {
            Ok(line) => {
                if let Ok(value) = serde_json::from_str::<Value>(&line) {
                    if value["payload"]["cwd"].as_str() == Some(project_path) {
                        if let Ok(info) = get_session_info(path) {
                            let original_text = info.user_message.unwrap_or_default();
                            let truncated_text: String = original_text.chars().take(50).collect();
                            sessions.push(json!({
                                "path": file_path,
                                "conversationId": info.session_id,
                                "preview": truncated_text
                            }));
                        }
                    }
                }
            }
            Err(e) => eprintln!("Failed to read first line: {}", e),
        }
    }

    // Sort newest first
    sessions.sort_by(|a, b| {
        let a_dt = extract_datetime(a["path"].as_str().unwrap_or_default());
        let b_dt = extract_datetime(b["path"].as_str().unwrap_or_default());
        match (a_dt, b_dt) {
            (Some(a_dt), Some(b_dt)) => b_dt.cmp(&a_dt),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => a["path"].as_str().cmp(&b["path"].as_str()),
        }
    });

    let file_names = sessions
        .iter()
        .filter_map(|session| session["path"].as_str())
        .map(|path| {
            Path::new(path)
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or(path)
                .to_string()
        })
        .collect();

    Ok(ScanResult {
        sessions,
        file_names,
    })
}

/// Scan all projects that appear in sessions folder
#[tauri::command]
pub async fn scan_projects() -> Result<Vec<Value>, String> {
    let sessions_dir = get_sessions_path()?;
    let mut unique_projects = HashSet::new();

    for entry in scan_jsonl_files(&sessions_dir) {
        let file_path = entry.path().to_path_buf();

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

        let mut project_path: Option<String> = None;
        match read_first_line(&file_path) {
            Ok(line) => {
                if let Ok(value) = serde_json::from_str::<Value>(&line) {
                    if let Some(cwd) = value["payload"]["cwd"].as_str() {
                        project_path = Some(cwd.to_string());
                    }
                }
            }
            Err(e) => eprintln!("Failed to read first line for {:?}: {}", file_path, e),
        }

        if let Some(cwd) = project_path {
            unique_projects.insert(cwd);
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
