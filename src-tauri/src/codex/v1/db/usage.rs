use chrono::{DateTime, Utc};
use rusqlite::params;
use serde_json::{json, Value};
use std::fs::read_to_string;
use walkdir::WalkDir;
use codex_protocol::protocol::TokenUsage;

use super::get_connection;
use crate::codex::v1::session_files::file::get_sessions_path;
use crate::codex::v1::session_files::utils::{parse_session_project_path, parse_filename_metadata};

/// Get the last scanned timestamp for usage tracking
pub(crate) fn get_usage_last_scanned() -> Result<Option<DateTime<Utc>>, String> {
    let conn = get_connection()?;

    let last_timestamp: Option<String> = conn
        .query_row(
            "SELECT MAX(timestamp) FROM usage",
            [],
            |row| {
                // Handle NULL case when table is empty
                match row.get::<_, Option<String>>(0) {
                    Ok(opt) => Ok(opt),
                    Err(_) => Ok(None),
                }
            },
        )
        .map_err(|e| format!("Failed to query usage timestamp: {}", e))?;

    match last_timestamp {
        Some(s) => {
            let dt = DateTime::parse_from_rfc3339(&s)
                .map_err(|e| format!("Failed to parse timestamp: {}", e))?
                .with_timezone(&Utc);
            Ok(Some(dt))
        }
        None => Ok(None),
    }
}

/// Insert or update usage records in the database
pub(crate) fn upsert_usage_record(
    session_id: &str,
    rollout_path: &str,
    project_path: Option<&str>,
    input_tokens: i64,
    cached_input_tokens: i64,
    output_tokens: i64,
    reasoning_output_tokens: i64,
    total_tokens: i64,
    timestamp: &str,
) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "INSERT OR REPLACE INTO usage
         (session_id, rollout_path, project_path, input_tokens, cached_input_tokens,
          output_tokens, reasoning_output_tokens, total_tokens, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            session_id,
            rollout_path,
            project_path,
            input_tokens,
            cached_input_tokens,
            output_tokens,
            reasoning_output_tokens,
            total_tokens,
            timestamp
        ],
    )
    .map_err(|e| format!("Failed to insert usage record: {}", e))?;

    Ok(())
}

/// Read all usage records from the database
pub(crate) fn get_all_usage_records() -> Result<Vec<Value>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT session_id, rollout_path, project_path, input_tokens, cached_input_tokens,
                    output_tokens, reasoning_output_tokens, total_tokens, timestamp
             FROM usage
             ORDER BY timestamp DESC"
        )
        .map_err(|e| format!("Failed to prepare usage query: {}", e))?;

    let usage_records: Result<Vec<Value>, String> = stmt
        .query_map([], |row| {
            let session_id: String = row.get(0)?;
            let rollout_path: String = row.get(1)?;
            let project_path: Option<String> = row.get(2)?;
            let input_tokens: i64 = row.get(3)?;
            let cached_input_tokens: i64 = row.get(4)?;
            let output_tokens: i64 = row.get(5)?;
            let reasoning_output_tokens: i64 = row.get(6)?;
            let total_tokens: i64 = row.get(7)?;
            let timestamp: String = row.get(8)?;

            Ok(json!({
                "sessionId": session_id,
                "rolloutPath": rollout_path,
                "projectPath": project_path,
                "usage": {
                    "input_tokens": input_tokens,
                    "cached_input_tokens": cached_input_tokens,
                    "output_tokens": output_tokens,
                    "reasoning_output_tokens": reasoning_output_tokens,
                    "total_tokens": total_tokens,
                },
                "timestamp": timestamp,
            }))
        })
        .map_err(|e| format!("Failed to query usage: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect usage records: {}", e));

    usage_records
}

/// Scan usage files after a given timestamp
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
                upsert_usage_record(
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

/// Read token usage from all session files
pub async fn read_token_usage() -> Result<Vec<Value>, String> {
    // Get the last scanned timestamp from database
    let last_scanned = get_usage_last_scanned()?;

    println!("last_scanned: {:?}", last_scanned);

    // Scan for new usage files
    let added_count = scan_usage_files_after(last_scanned)?;

    println!("Added {} new usage records", added_count);

    // Read all usage records from database
    let usage_records = get_all_usage_records()?;

    Ok(usage_records)
}
