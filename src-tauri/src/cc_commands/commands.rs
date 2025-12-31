use super::state::CCState;
use claude_agent_sdk_rs::{ClaudeAgentOptions, Message, PermissionMode};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use std::path::PathBuf;
use uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CCConnectParams {
    pub session_id: String,
    pub cwd: String,
    pub model: Option<String>,
    pub permission_mode: Option<String>,
    pub resume_id: Option<String>,
}

/// Serializable options for ClaudeAgent
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AgentOptions {
    pub cwd: String,
    pub model: Option<String>,
    pub permission_mode: Option<String>,
    pub fallback_model: Option<String>,
    pub max_turns: Option<u32>,
    pub max_budget_usd: Option<f64>,
    pub max_thinking_tokens: Option<u32>,
    pub settings: Option<String>,
    pub allowed_tools: Option<Vec<String>>,
    pub disallowed_tools: Option<Vec<String>>,
}

impl AgentOptions {
    pub fn to_claude_options(&self, resume_id: Option<String>) -> ClaudeAgentOptions {
        use std::sync::Arc;

        let permission_mode = self.permission_mode
            .as_ref()
            .and_then(|m| parse_permission_mode(m));

        ClaudeAgentOptions {
            cwd: Some(PathBuf::from(&self.cwd)),
            model: self.model.clone(),
            fallback_model: self.fallback_model.clone(),
            max_turns: self.max_turns,
            max_budget_usd: self.max_budget_usd,
            max_thinking_tokens: self.max_thinking_tokens,
            settings: self.settings.clone(),
            permission_mode,
            allowed_tools: self.allowed_tools.clone().unwrap_or_default(),
            disallowed_tools: self.disallowed_tools.clone().unwrap_or_default(),
            resume: resume_id,
            stderr_callback: Some(Arc::new(|msg| {
                log::error!("[CC STDERR] {}", msg);
            })),
            ..Default::default()
        }
    }
}

fn parse_permission_mode(mode: &str) -> Option<PermissionMode> {
    match mode {
        "default" => Some(PermissionMode::Default),
        "acceptEdits" => Some(PermissionMode::AcceptEdits),
        "plan" => Some(PermissionMode::Plan),
        "bypassPermissions" => Some(PermissionMode::BypassPermissions),
        _ => None,
    }
}

#[tauri::command]
pub async fn cc_connect(
    params: CCConnectParams,
    state: State<'_, CCState>,
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

#[tauri::command]
pub async fn cc_send_message(
    session_id: String,
    message: String,
    app: AppHandle,
    state: State<'_, CCState>,
) -> Result<(), String> {
    let client = state
        .get_client(&session_id)
        .await
        .ok_or("Client not found")?;

    // Send the query
    {
        let mut client = client.lock().await;
        client.query(&message).await.map_err(|e| e.to_string())?;
    }

    // Start streaming responses in a background task
    tauri::async_runtime::spawn(async move {
        let client = client.lock().await;
        let mut stream = client.receive_response();

        while let Some(result) = stream.next().await {
            match result {
                Ok(msg) => {
                    // Emit each message to the frontend as it arrives
                    let event_name = format!("cc-message:{}", session_id);
                    if let Err(e) = app.emit(&event_name, &msg) {
                        log::error!("Failed to emit message: {}", e);
                    }

                    // Stop streaming on Result message
                    if matches!(msg, Message::Result(_)) {
                        break;
                    }
                }
                Err(e) => {
                    log::error!("Error receiving message: {}", e);
                    break;
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn cc_disconnect(session_id: String, state: State<'_, CCState>) -> Result<(), String> {
    state.remove_client(&session_id).await
}

#[tauri::command]
pub async fn cc_new_session(
    options: AgentOptions,
    state: State<'_, CCState>,
) -> Result<String, String> {
    let session_id = uuid::Uuid::new_v4().to_string();

    let claude_options = options.to_claude_options(None);

    state
        .create_client(session_id.clone(), claude_options)
        .await?;

    let client = state
        .get_client(&session_id)
        .await
        .ok_or("Failed to get client")?;

    let mut client = client.lock().await;
    client.connect().await.map_err(|e| e.to_string())?;

    Ok(session_id)
}

#[tauri::command]
pub async fn cc_interrupt(session_id: String, state: State<'_, CCState>) -> Result<(), String> {
    let client = state
        .get_client(&session_id)
        .await
        .ok_or("Client not found")?;

    let client = client.lock().await;
    client.interrupt().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn cc_list_sessions(state: State<'_, CCState>) -> Result<Vec<String>, String> {
    let clients = state.clients.lock().await;
    Ok(clients.keys().cloned().collect())
}

// Resume a session and stream its history
#[tauri::command]
pub async fn cc_resume_session(
    session_id: String,
    options: AgentOptions,
    app: AppHandle,
    state: State<'_, CCState>,
) -> Result<(), String> {
    use std::fs;
    use std::io::{BufRead, BufReader};

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
        let event_name = format!("cc-message:{}", session_id);

        // Emit each historical message
        for line in reader.lines() {
            let line = line.map_err(|e| format!("Failed to read line: {}", e))?;
            let sanitized = line.replace('\u{0000}', "").trim().to_string();

            if sanitized.is_empty() || !sanitized.ends_with('}') {
                continue;
            }

            // Parse and emit the message
            if let Ok(msg) = serde_json::from_str::<Message>(&sanitized) {
                if let Err(e) = app.emit(&event_name, &msg) {
                    log::error!("Failed to emit historical message: {}", e);
                }
            }
        }
    }

    // Create client with resume_id to continue the conversation
    let claude_options = options.to_claude_options(Some(session_id.clone()));

    state
        .create_client(session_id.clone(), claude_options)
        .await?;

    let client = state
        .get_client(&session_id)
        .await
        .ok_or("Failed to get client")?;

    let mut client_guard = client.lock().await;
    client_guard.connect().await.map_err(|e| e.to_string())?;

    Ok(())
}
