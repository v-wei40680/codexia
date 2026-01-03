use crate::cc_commands::state::CCState;
use crate::cc_commands::db::{SessionDB, SessionData};
use claude_agent_sdk_rs::{ClaudeAgentOptions, Message};
use std::path::PathBuf;
use std::fs;
use std::io::{BufRead, BufReader};
use uuid;

use super::super::{AgentOptions, CCConnectParams, parse_permission_mode};

pub async fn connect(
    params: CCConnectParams,
    state: &CCState,
) -> Result<(), String> {
    use std::sync::Arc;

    let permission_mode = params
        .permission_mode
        .as_ref()
        .and_then(|mode| parse_permission_mode(mode));

    let options = ClaudeAgentOptions {
        cwd: Some(PathBuf::from(&params.cwd)),
        model: params.model,
        permission_mode,
        resume: params.resume_id,
        stderr_callback: Some(Arc::new(|msg| {
            log::error!("[CC STDERR] {}", msg);
        })),
        ..Default::default()
    };

    state
        .create_client(params.session_id.clone(), options)
        .await?;

    let client = state
        .get_client(&params.session_id)
        .await
        .ok_or("Failed to get client")?;

    let mut client = client.lock().await;
    client.connect().await.map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn disconnect(session_id: &str, state: &CCState) -> Result<(), String> {
    state.remove_client(session_id).await
}

pub async fn new_session(
    options: AgentOptions,
    state: &CCState,
) -> Result<String, String> {
    let session_id = uuid::Uuid::new_v4().to_string();

    let claude_options = options.to_claude_options(None);

    state
        .create_client(session_id.clone(), claude_options)
        .await?;

    Ok(session_id)
}

pub async fn interrupt(session_id: &str, state: &CCState) -> Result<(), String> {
    let client = state
        .get_client(session_id)
        .await
        .ok_or("Client not found")?;

    let client = client.lock().await;
    client.interrupt().await.map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn list_sessions(state: &CCState) -> Result<Vec<String>, String> {
    let clients = state.clients.lock().await;
    Ok(clients.keys().cloned().collect())
}

pub async fn resume_session(
    session_id: String,
    options: AgentOptions,
    state: &CCState,
    message_callback: impl Fn(Message) + Send + 'static,
) -> Result<(), String> {
    // Read history from .jsonl file
    let dir = options.cwd.replace("/", "-").replace("\\", "-");
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let history_path = home
        .join(".claude")
        .join("projects")
        .join(&dir)
        .join(format!("{}.jsonl", session_id));

    if history_path.exists() {
        let file = fs::File::open(&history_path)
            .map_err(|e| format!("Failed to open history file: {}", e))?;
        let reader = BufReader::new(file);

        // Emit each historical message
        for line in reader.lines() {
            let line = line.map_err(|e| format!("Failed to read line: {}", e))?;
            let sanitized = line.replace('\u{0000}', "").trim().to_string();

            if sanitized.is_empty() || !sanitized.ends_with('}') {
                continue;
            }

            // Parse and emit the message
            if let Ok(msg) = serde_json::from_str::<Message>(&sanitized) {
                message_callback(msg);
            }
        }
    }

    // Create client with resume_id to continue the conversation
    let claude_options = options.to_claude_options(Some(session_id.clone()));

    state
        .create_client(session_id.clone(), claude_options)
        .await?;

    Ok(())
}

pub fn get_sessions() -> Result<Vec<SessionData>, String> {
    let db = SessionDB::new().map_err(|e| format!("Failed to open database: {}", e))?;
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let projects_dir = home.join(".claude").join("projects");

    if !projects_dir.exists() {
        return Ok(vec![]);
    }

    let slash_commands: Vec<&str> = vec!["/ide", "/model", "/status"];

    for entry in fs::read_dir(&projects_dir).map_err(|e| format!("Failed to read projects dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let project_dir = entry.path();

        if !project_dir.is_dir() {
            continue;
        }

        for session_entry in fs::read_dir(&project_dir).map_err(|e| format!("Failed to read project dir: {}", e))? {
            let session_entry = session_entry.map_err(|e| format!("Failed to read session entry: {}", e))?;
            let session_path = session_entry.path();

            if session_path.extension().and_then(|s| s.to_str()) != Some("jsonl") {
                continue;
            }

            let file_name = session_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");

            // Skip agent-*.jsonl files
            if file_name.starts_with("agent-") {
                continue;
            }

            let file_path_str = session_path.to_str().unwrap_or("");

            // Skip if already scanned
            if db.is_scanned(file_path_str).unwrap_or(false) {
                continue;
            }

            // Find the first line with type: "user"
            if let Ok(file) = fs::File::open(&session_path) {
                let reader = BufReader::new(file);

                let mut session_id = String::new();
                let mut cwd = String::new();
                let mut timestamp: i64 = 0;
                let mut display = String::from("Untitled");
                let mut found_user_message = false;

                for line in reader.lines().filter_map(|l| l.ok()) {
                    let sanitized = line.replace('\u{0000}', "").trim().to_string();

                    if sanitized.is_empty() || !sanitized.ends_with('}') {
                        continue;
                    }

                    if let Ok(data) = serde_json::from_str::<serde_json::Value>(&sanitized) {
                        // Get session metadata from any line
                        if session_id.is_empty() {
                            if let Some(sid) = data.get("sessionId").and_then(|s| s.as_str()) {
                                session_id = sid.to_string();
                            }
                        }
                        if cwd.is_empty() {
                            if let Some(c) = data.get("cwd").and_then(|c| c.as_str()) {
                                cwd = c.to_string();
                            }
                        }

                        // Look for first user message
                        if data.get("type").and_then(|t| t.as_str()) == Some("user") {
                            timestamp = data.get("timestamp")
                                .and_then(|t| t.as_str())
                                .and_then(|t| chrono::DateTime::parse_from_rfc3339(t).ok())
                                .map(|dt| dt.timestamp())
                                .unwrap_or(0);

                            if let Some(msg_display) = data.get("message")
                                .and_then(|m| m.get("content"))
                                .and_then(|c| c.as_str())
                            {
                                // Skip slash commands
                                if slash_commands.contains(&msg_display.trim()) {
                                    break;
                                }

                                // Extract first line as display
                                display = msg_display.lines().next().unwrap_or("Untitled").to_string();
                                found_user_message = true;
                                break;
                            }
                        }
                    }
                }

                if found_user_message && !session_id.is_empty() && !cwd.is_empty() {
                    let session = SessionData {
                        session_id,
                        project: cwd,
                        display,
                        timestamp,
                    };

                    let _ = db.insert_session(&session, file_path_str);
                }
            }
        }
    }

    db.get_all_sessions()
        .map_err(|e| format!("Failed to get sessions: {}", e))
}
