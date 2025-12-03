use super::db::{get_usage_last_scanned, read_all_usage, upsert_usage_records};
use super::file::get_sessions_path;
use super::utils::{parse_session_project_path, parse_filename_metadata};
use chrono::{DateTime, Utc};
use codex_protocol::protocol::TokenUsage;
use serde_json::Value;
use std::fs::read_to_string;
use walkdir::WalkDir;

fn scan_usage_files_after(
    last_scanned: Option<DateTime<Utc>>,
) -> Result<usize, String> {
    let sessions_dir = get_sessions_path()?;
    let mut added_count = 0;

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
                upsert_usage_records(
                    &uuid_str,
                    &path.to_string_lossy().to_string(),
                    project_path.as_deref(),
                    current_file_usage.input_tokens as i64,
                    current_file_usage.cached_input_tokens as i64,
                    current_file_usage.output_tokens as i64,
                    current_file_usage.reasoning_output_tokens as i64,
                    current_file_usage.total_tokens as i64,
                    &file_timestamp.to_rfc3339(),
                )?;
                added_count += 1;
            }
        }
    }
    Ok(added_count)
}

pub async fn read_token_usage() -> Result<Vec<Value>, String> {
    // Get the last scanned timestamp from database
    let last_scanned = get_usage_last_scanned()?;

    println!("last_scanned: {:?}", last_scanned);

    // Scan for new usage files
    let added_count = scan_usage_files_after(last_scanned)?;

    println!("Added {} new usage records", added_count);

    // Read all usage records from database
    let usage_records = read_all_usage()?;

    Ok(usage_records)
}
