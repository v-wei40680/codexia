use serde::{Deserialize, Serialize};
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

#[derive(Debug, Deserialize)]
struct SessionRecord {
    id: Option<String>,
    timestamp: Option<String>,
    #[serde(rename = "type")]
    message_type: Option<String>,
    role: Option<String>,
    content: Option<serde_json::Value>,
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
        if let Ok(record) = serde_json::from_str::<SessionRecord>(line) {
            // Get session metadata
            if record.id.is_some() && record.timestamp.is_some() {
                session_id = record.id;
                session_timestamp = record.timestamp;
            }

            // Parse messages (check for "type": "message")
            if record.message_type.as_deref() == Some("message")
                && record.role.is_some()
                && record.content.is_some()
            {
                let role = record.role.unwrap();
                let content_value = record.content.unwrap();

                let content_text = if let Some(array) = content_value.as_array() {
                    array
                        .iter()
                        .filter_map(|item| {
                            if let Some(obj) = item.as_object() {
                                if let Some(text) = obj.get("text") {
                                    text.as_str()
                                } else {
                                    None
                                }
                            } else {
                                None
                            }
                        })
                        .collect::<Vec<_>>()
                        .join("")
                } else if let Some(text) = content_value.as_str() {
                    text.to_string()
                } else {
                    String::new()
                };

                // Capture project cwd from environment_context (may be recorded as user message)
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
                    // Filter out meta/system blocks from transcript rendering, but still use them to extract metadata
                    let is_meta_block = content_text.contains("<user_instructions>")
                        || content_text.contains("<environment_context>");

                    let timestamp = if let Some(ts) = &session_timestamp {
                        chrono::DateTime::parse_from_rfc3339(ts)
                            .map(|dt| dt.timestamp_millis())
                            .unwrap_or_else(|_| chrono::Utc::now().timestamp_millis())
                    } else {
                        chrono::Utc::now().timestamp_millis()
                    };

                    if !is_meta_block {
                        messages.push(ChatMessage {
                            id: format!(
                                "{}-{}-{}",
                                session_id.as_ref().unwrap_or(&"unknown".to_string()),
                                role,
                                timestamp
                            ),
                            role,
                            content: content_text.trim().to_string(),
                            timestamp,
                        });
                    }
                }
            }
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
            log::debug!(
                "Parsed session file: {:?} -> id={}, project={:?}, messages={}",
                file_path,
                convo.id,
                convo.project_realpath,
                convo.messages.len()
            );
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
            let first_line = content.lines().next().unwrap_or("");
            if let Ok(record) = serde_json::from_str::<SessionRecord>(first_line) {
                if let Some(id) = record.id {
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

    Ok(None)
}
