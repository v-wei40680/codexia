use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub messages: Vec<ChatMessage>,
    pub mode: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    #[serde(rename = "isFavorite")]
    pub is_favorite: bool,
    #[serde(rename = "filePath")]
    pub file_path: Option<String>,
    #[serde(rename = "projectRealpath")]
    pub project_realpath: Option<String>,
}

fn extract_text_from_content(value: &Value) -> String {
    if let Some(array) = value.as_array() {
        array
            .iter()
            .filter_map(|entry| entry.as_object())
            .filter_map(|object| object.get("text"))
            .filter_map(|value| value.as_str())
            .collect::<Vec<_>>()
            .join("")
    } else if let Some(text) = value.as_str() {
        text.to_string()
    } else {
        String::new()
    }
}

pub fn parse_session_file(content: &str, file_path: &Path) -> Option<Conversation> {
    let lines: Vec<&str> = content.trim().lines().collect();
    if lines.is_empty() {
        return None;
    }

    let mut session_id = None;
    let mut session_timestamp = None;
    let mut messages = Vec::new();
    let mut project_realpath: Option<String> = None;

    for line in &lines {
        let record: Value = match serde_json::from_str(line) {
            Ok(value) => value,
            Err(error) => {
                eprintln!("Skipping malformed session line in {:?}: {}", file_path, error);
                continue;
            }
        };

        let record_type = record
            .get("type")
            .and_then(|value| value.as_str())
            .unwrap_or_default();

        if session_id.is_none() {
            if let Some(id) = record.get("id").and_then(|value| value.as_str()) {
                session_id = Some(id.to_string());
            }
        }

        if session_timestamp.is_none() {
            if let Some(ts) = record.get("timestamp").and_then(|value| value.as_str()) {
                session_timestamp = Some(ts.to_string());
            }
        }

        let payload = record.get("payload");

        match record_type {
            "session_meta" => {
                if let Some(meta) = payload.and_then(|value| value.as_object()) {
                    if let Some(id) = meta.get("id").and_then(|value| value.as_str()) {
                        session_id = Some(id.to_string());
                    }

                    if let Some(ts) = meta.get("timestamp").and_then(|value| value.as_str()) {
                        session_timestamp = Some(ts.to_string());
                    }

                    if project_realpath.is_none() {
                        if let Some(cwd) = meta.get("cwd").and_then(|value| value.as_str()) {
                            let trimmed = cwd.trim();
                            if !trimmed.is_empty() {
                                project_realpath = Some(trimmed.to_string());
                            }
                        }
                    }
                }
            }
            "response_item" => {
                if let Some(item) = payload.and_then(|value| value.as_object()) {
                    let payload_type = item
                        .get("type")
                        .and_then(|value| value.as_str())
                        .unwrap_or_default();

                    if payload_type != "message" {
                        continue;
                    }

                    let role = item
                        .get("role")
                        .and_then(|value| value.as_str())
                        .unwrap_or("user")
                        .to_string();

                    let content_value = item.get("content").cloned().unwrap_or(Value::Null);

                    let content_text = extract_text_from_content(&content_value);

                    if project_realpath.is_none() {
                        if content_text.contains("<environment_context>") && content_text.contains("<cwd>") {
                            if let (Some(start), Some(end)) = (content_text.find("<cwd>"), content_text.find("</cwd>")) {
                                if end > start + 5 {
                                    let start_idx = start + 5;
                                    let cwd = content_text[start_idx..end].trim();
                                    if !cwd.is_empty() {
                                        project_realpath = Some(cwd.to_string());
                                    }
                                }
                            }
                        }
                    }

                    if !content_text.trim().is_empty() {
                        let is_meta_block = content_text.contains("<user_instructions>")
                            || content_text.contains("<environment_context>");

                        let timestamp = record
                            .get("timestamp")
                            .and_then(|value| value.as_str())
                            .and_then(|ts| chrono::DateTime::parse_from_rfc3339(ts).ok())
                            .map(|dt| dt.timestamp_millis())
                            .or_else(|| {
                                session_timestamp.as_ref().and_then(|ts| {
                                    chrono::DateTime::parse_from_rfc3339(ts)
                                        .map(|dt| dt.timestamp_millis())
                                        .ok()
                                })
                            })
                            .unwrap_or_else(|| chrono::Utc::now().timestamp_millis());

                        if !is_meta_block {
                            let message_id_prefix = session_id.clone().unwrap_or_else(|| "unknown".to_string());
                            messages.push(ChatMessage {
                                id: format!("{}-{}-{}", message_id_prefix, role, timestamp),
                                role,
                                content: content_text.trim().to_string(),
                                timestamp,
                            });
                        }
                    }
                }
            }
            "message" => {
                let role = record
                    .get("role")
                    .and_then(|value| value.as_str())
                    .unwrap_or("user")
                    .to_string();

                let content_text = record
                    .get("content")
                    .map(|value| extract_text_from_content(value))
                    .unwrap_or_default();

                if project_realpath.is_none() {
                    if content_text.contains("<environment_context>") && content_text.contains("<cwd>") {
                        if let (Some(start), Some(end)) = (content_text.find("<cwd>"), content_text.find("</cwd>")) {
                            if end > start + 5 {
                                let start_idx = start + 5;
                                let cwd = content_text[start_idx..end].trim();
                                if !cwd.is_empty() {
                                    project_realpath = Some(cwd.to_string());
                                }
                            }
                        }
                    }
                }

                if !content_text.trim().is_empty() {
                    let is_meta_block = content_text.contains("<user_instructions>")
                        || content_text.contains("<environment_context>");

                    let timestamp = record
                        .get("timestamp")
                        .and_then(|value| value.as_str())
                        .and_then(|ts| chrono::DateTime::parse_from_rfc3339(ts).ok())
                        .map(|dt| dt.timestamp_millis())
                        .or_else(|| {
                            session_timestamp.as_ref().and_then(|ts| {
                                chrono::DateTime::parse_from_rfc3339(ts)
                                    .map(|dt| dt.timestamp_millis())
                                    .ok()
                            })
                        })
                        .unwrap_or_else(|| chrono::Utc::now().timestamp_millis());

                    if !is_meta_block {
                        let message_id_prefix = session_id.clone().unwrap_or_else(|| "unknown".to_string());
                        messages.push(ChatMessage {
                            id: format!("{}-{}-{}", message_id_prefix, role, timestamp),
                            role,
                            content: content_text.trim().to_string(),
                            timestamp,
                        });
                    }
                }
            }
            _ => {}
        }
    }

    // If we only have metadata (one line) and no messages, delete the file
    if lines.len() == 1 && messages.is_empty() && session_id.is_some() {
        if let Err(e) = fs::remove_file(file_path) {
            eprintln!("Failed to delete metadata-only file {:?}: {}", file_path, e);
        } else {
            println!("Deleted metadata-only session file: {:?}", file_path);
        }
        return None;
    }

    if let (Some(id), Some(timestamp_str)) = (session_id, session_timestamp) {
        if !messages.is_empty() {
            let timestamp = chrono::DateTime::parse_from_rfc3339(&timestamp_str)
                .map(|dt| dt.timestamp_millis())
                .unwrap_or_else(|_| chrono::Utc::now().timestamp_millis());

            // Generate title from first user message
            let title = messages
                .iter()
                .find(|m| m.role == "user")
                .map(|m| {
                    if m.content.chars().count() > 50 {
                        let truncated: String = m.content.chars().take(50).collect();
                        format!("{}...", truncated)
                    } else {
                        m.content.clone()
                    }
                })
                .unwrap_or_else(|| "Imported Session".to_string());

            let file_path_str = file_path
                .canonicalize()
                .ok()
                .and_then(|p| p.to_str().map(|s| s.to_string()));

            let full_session_id = if id.starts_with("codex-event-") {
                id
            } else {
                format!("codex-event-{}", id)
            };

            let convo = Conversation {
                id: full_session_id,
                title,
                messages,
                mode: "agent".to_string(),
                created_at: timestamp,
                updated_at: timestamp,
                is_favorite: false,
                file_path: file_path_str,
                project_realpath,
            };
            /*
            log::debug!(
                "Parsed session file: {:?} -> id={}, project={:?}, messages={}",
                file_path,
                convo.id,
                convo.project_realpath,
                convo.messages.len()
            );
            */
            return Some(convo);
        }
    }

    None
}

pub async fn load_sessions_from_disk() -> Result<Vec<Conversation>, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let sessions_path = home_dir.join(".codex").join("sessions");

    if !sessions_path.exists() {
        return Ok(Vec::new());
    }

    let mut conversations = Vec::new();

    for entry in WalkDir::new(&sessions_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("jsonl"))
    {
        match fs::read_to_string(entry.path()) {
            Ok(content) => {
                if let Some(conversation) = parse_session_file(&content, entry.path()) {
                    conversations.push(conversation);
                }
            }
            Err(e) => {
                eprintln!("Error reading file {:?}: {}", entry.path(), e);
            }
        }
    }

    // Sort by updated_at (newest first)
    conversations.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    println!("Total conversations loaded: {}", conversations.len());

    Ok(conversations)
}

pub async fn delete_session_file(file_path: String) -> Result<(), String> {
    fs::remove_file(&file_path).map_err(|e| format!("Failed to delete file '{}': {}", file_path, e))
}

pub async fn get_latest_session_id() -> Result<Option<String>, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let sessions_path = home_dir.join(".codex").join("sessions");

    if !sessions_path.exists() {
        return Ok(None);
    }

    let mut latest_file: Option<(std::path::PathBuf, std::time::SystemTime)> = None;

    // Find the most recently modified .jsonl file
    for entry in WalkDir::new(&sessions_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("jsonl"))
    {
        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                match &latest_file {
                    None => latest_file = Some((entry.path().to_path_buf(), modified)),
                    Some((_, latest_time)) => {
                        if modified > *latest_time {
                            latest_file = Some((entry.path().to_path_buf(), modified));
                        }
                    }
                }
            }
        }
    }

    if let Some((file_path, _)) = latest_file {
        // Read the first line to get session ID
        if let Ok(content) = fs::read_to_string(&file_path) {
            if let Some(first_line) = content.lines().next() {
                if let Ok(record) = serde_json::from_str::<Value>(first_line) {
                    let mut id_value = record
                        .get("id")
                        .and_then(|value| value.as_str())
                        .map(|s| s.to_string());

                    if id_value.is_none() {
                        if let Some(payload) = record.get("payload").and_then(|value| value.as_object()) {
                            if let Some(meta_id) = payload.get("id").and_then(|value| value.as_str()) {
                                id_value = Some(meta_id.to_string());
                            }
                        }
                    }

                    if let Some(id) = id_value {
                        let full_session_id = if id.starts_with("codex-event-") {
                            id
                        } else {
                            format!("codex-event-{}", id)
                        };
                        return Ok(Some(full_session_id));
                    }
                }
            }
        }
    }

    Ok(None)
}
