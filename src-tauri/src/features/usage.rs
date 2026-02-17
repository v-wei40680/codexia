use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use chrono::{DateTime, Utc};
use codex_protocol::protocol::TokenUsage;
use serde_json::{Value, json};
use walkdir::WalkDir;

fn codex_home() -> PathBuf {
    if let Some(path) = std::env::var_os("CODEX_HOME") {
        return PathBuf::from(path);
    }

    dirs::home_dir()
        .map(|home| home.join(".codex"))
        .unwrap_or_else(|| PathBuf::from(".codex"))
}

fn parse_json_line(line: &str) -> Option<Value> {
    serde_json::from_str(line).ok()
}

fn file_timestamp_rfc3339(path: &Path) -> Option<String> {
    let modified = std::fs::metadata(path).ok()?.modified().ok()?;
    let dt: DateTime<Utc> = DateTime::<Utc>::from(modified);
    Some(dt.to_rfc3339())
}

fn extract_timestamp(value: &Value, path: &Path) -> String {
    let payload_ts = value
        .get("payload")
        .and_then(|v| v.get("timestamp"))
        .and_then(Value::as_str);
    let row_ts = value.get("timestamp").and_then(Value::as_str);

    payload_ts
        .or(row_ts)
        .map(ToOwned::to_owned)
        .or_else(|| file_timestamp_rfc3339(path))
        .unwrap_or_else(|| DateTime::<Utc>::from(SystemTime::now()).to_rfc3339())
}

fn extract_session_id(value: &Value, path: &Path) -> String {
    value
        .get("payload")
        .and_then(|v| v.get("id"))
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
        .or_else(|| {
            path.file_stem()
                .and_then(|s| s.to_str())
                .map(ToOwned::to_owned)
        })
        .unwrap_or_else(|| "unknown".to_string())
}

fn extract_project_path(value: &Value) -> Option<String> {
    value
        .get("payload")
        .and_then(|v| v.get("cwd"))
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
}

fn extract_latest_token_usage(lines: &[String]) -> TokenUsage {
    let mut current = TokenUsage::default();

    for line in lines {
        let Some(event) = parse_json_line(line) else {
            continue;
        };
        let Some(payload) = event.get("payload") else {
            continue;
        };
        let Some(payload_type) = payload.get("type").and_then(Value::as_str) else {
            continue;
        };
        if payload_type != "token_count" {
            continue;
        }

        let Some(info) = payload.get("info") else {
            continue;
        };
        if info.is_null() {
            continue;
        }

        let Some(total_token_usage) = info.get("total_token_usage") else {
            continue;
        };

        if let Ok(usage) = serde_json::from_value::<TokenUsage>(total_token_usage.clone()) {
            if usage.input_tokens > 0 {
                current = usage;
            }
        }
    }

    current
}

pub async fn read_token_usage() -> Result<Vec<Value>, String> {
    let sessions_dir = codex_home().join("sessions");
    if !sessions_dir.exists() {
        return Ok(Vec::new());
    }

    let mut records: Vec<Value> = Vec::new();

    for entry in WalkDir::new(&sessions_dir)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !entry.file_type().is_file() {
            continue;
        }
        if path.extension().and_then(|ext| ext.to_str()) != Some("jsonl") {
            continue;
        }

        let file = match File::open(path) {
            Ok(file) => file,
            Err(_) => continue,
        };
        let reader = BufReader::new(file);
        let lines: Vec<String> = reader.lines().map_while(Result::ok).collect();
        if lines.is_empty() {
            continue;
        }

        let Some(first_row) = parse_json_line(&lines[0]) else {
            continue;
        };

        let usage = extract_latest_token_usage(&lines);
        if usage.input_tokens == 0 {
            continue;
        }

        let session_id = extract_session_id(&first_row, path);
        let project_path = extract_project_path(&first_row);
        let timestamp = extract_timestamp(&first_row, path);

        records.push(json!({
            "sessionId": session_id,
            "rolloutPath": path.to_string_lossy().to_string(),
            "projectPath": project_path,
            "usage": {
                "input_tokens": usage.input_tokens,
                "cached_input_tokens": usage.cached_input_tokens,
                "output_tokens": usage.output_tokens,
                "reasoning_output_tokens": usage.reasoning_output_tokens,
                "total_tokens": usage.total_tokens,
            },
            "timestamp": timestamp,
        }));
    }

    records.sort_by(|a, b| {
        let a_ts = a
            .get("timestamp")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let b_ts = b
            .get("timestamp")
            .and_then(Value::as_str)
            .unwrap_or_default();
        b_ts.cmp(a_ts)
    });

    Ok(records)
}
