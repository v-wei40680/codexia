use crate::codex_client::CodexClient;
use crate::protocol::CodexConfig;
use crate::state::CodexState;
use crate::utils::codex_discovery::discover_codex_command;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::{AppHandle, State};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
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

fn parse_session_file(content: &str, _file_path: &Path) -> Option<Conversation> {
    let lines: Vec<&str> = content.trim().lines().collect();
    if lines.is_empty() {
        return None;
    }

    let mut session_id = None;
    let mut session_timestamp = None;
    let mut messages = Vec::new();

    for line in lines {
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

                if !content_text.trim().is_empty() {
                    let timestamp = if let Some(ts) = &session_timestamp {
                        chrono::DateTime::parse_from_rfc3339(ts)
                            .map(|dt| dt.timestamp_millis())
                            .unwrap_or_else(|_| chrono::Utc::now().timestamp_millis())
                    } else {
                        chrono::Utc::now().timestamp_millis()
                    };

                    messages.push(ChatMessage {
                        role,
                        content: content_text.trim().to_string(),
                        timestamp,
                    });
                }
            }
        }
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

            return Some(Conversation {
                id,
                title,
                messages,
                mode: "agent".to_string(),
                created_at: timestamp,
                updated_at: timestamp,
                is_favorite: false,
            });
        }
    }

    None
}

#[tauri::command]
pub async fn load_sessions_from_disk() -> Result<Vec<Conversation>, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let sessions_path = home_dir.join(".codex").join("sessions");

    if !sessions_path.exists() {
        return Ok(Vec::new());
    }

    let mut conversations = Vec::new();

    println!("Scanning sessions directory: {:?}", sessions_path);

    for entry in WalkDir::new(&sessions_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("jsonl"))
    {
        println!("Processing file: {:?}", entry.path());
        match fs::read_to_string(entry.path()) {
            Ok(content) => {
                if let Some(conversation) = parse_session_file(&content, entry.path()) {
                    println!("Successfully parsed conversation: {}", conversation.id);
                    conversations.push(conversation);
                } else {
                    println!("Failed to parse conversation from file: {:?}", entry.path());
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

#[tauri::command]
pub async fn start_codex_session(
    app: AppHandle,
    state: State<'_, CodexState>,
    session_id: String,
    config: CodexConfig,
) -> Result<(), String> {
    {
        let sessions = state.sessions.lock().await;
        if sessions.contains_key(&session_id) {
            return Ok(());
        }
    }

    let codex_client = CodexClient::new(&app, session_id.clone(), config)
        .await
        .map_err(|e| format!("Failed to start Codex session: {}", e))?;

    state.sessions.lock().await.insert(session_id, codex_client);
    Ok(())
}

#[tauri::command]
pub async fn send_message(
    state: State<'_, CodexState>,
    session_id: String,
    message: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().await;
    if let Some(client) = sessions.get_mut(&session_id) {
        client
            .send_user_input(message)
            .await
            .map_err(|e| format!("Failed to send message: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub async fn approve_execution(
    state: State<'_, CodexState>,
    session_id: String,
    approval_id: String,
    approved: bool,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().await;
    if let Some(client) = sessions.get_mut(&session_id) {
        client
            .send_exec_approval(approval_id, approved)
            .await
            .map_err(|e| format!("Failed to send approval: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub async fn stop_session(state: State<'_, CodexState>, session_id: String) -> Result<(), String> {
    let mut sessions = state.sessions.lock().await;
    if let Some(mut client) = sessions.remove(&session_id) {
        client
            .shutdown()
            .await
            .map_err(|e| format!("Failed to shutdown session: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub async fn get_running_sessions(state: State<'_, CodexState>) -> Result<Vec<String>, String> {
    let sessions = state.sessions.lock().await;
    Ok(sessions.keys().cloned().collect())
}

#[tauri::command]
pub async fn check_codex_version() -> Result<String, String> {
    use std::process::Command;

    let path = match discover_codex_command() {
        Some(p) => p.to_string_lossy().to_string(),
        None => "codex".to_string(),
    };

    let output = Command::new(&path)
        .arg("-V")
        .output()
        .map_err(|e| format!("Failed to execute codex binary: {}", e))?;

    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(version)
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(format!("Codex binary returned error: {}", err_msg))
    }
}
