use super::state::CCState;
use super::db::{SessionDB, SessionData};
use claude_agent_sdk_rs::{
    ClaudeAgentOptions, Message, PermissionMode, SdkPluginConfig,
};
use claude_agent_sdk_rs::types::mcp::{
    McpServers, McpServerConfig, McpStdioServerConfig, McpHttpServerConfig, McpSseServerConfig,
};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use std::path::PathBuf;
use std::fs;
use std::io::{BufRead, BufReader};
use std::collections::HashMap;
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

/// MCP server configuration for serialization
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum McpServerConfigSerde {
    Stdio {
        command: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        args: Option<Vec<String>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        env: Option<HashMap<String, String>>,
    },
    Http {
        url: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        headers: Option<HashMap<String, String>>,
    },
    Sse {
        url: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        headers: Option<HashMap<String, String>>,
    },
}

impl From<McpServerConfigSerde> for McpServerConfig {
    fn from(config: McpServerConfigSerde) -> Self {
        match config {
            McpServerConfigSerde::Stdio { command, args, env } => {
                McpServerConfig::Stdio(McpStdioServerConfig { command, args, env })
            }
            McpServerConfigSerde::Http { url, headers } => {
                McpServerConfig::Http(McpHttpServerConfig { url, headers })
            }
            McpServerConfigSerde::Sse { url, headers } => {
                McpServerConfig::Sse(McpSseServerConfig { url, headers })
            }
        }
    }
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
    pub enabled_skills: Option<Vec<String>>,
    pub mcp_servers: Option<HashMap<String, McpServerConfigSerde>>,
}

impl AgentOptions {
    pub fn to_claude_options(&self, resume_id: Option<String>) -> ClaudeAgentOptions {
        use std::sync::Arc;

        let permission_mode = self.permission_mode
            .as_ref()
            .and_then(|m| parse_permission_mode(m));

        // Convert enabled_skills to plugins
        let plugins = if let Some(skills) = &self.enabled_skills {
            let home = dirs::home_dir().unwrap_or_default();
            let skills_dir = home.join(".claude").join("skills");

            skills.iter()
                .map(|skill_name| {
                    SdkPluginConfig::local(skills_dir.join(skill_name))
                })
                .collect()
        } else {
            vec![]
        };

        // Convert MCP servers
        let mcp_servers = if let Some(servers) = &self.mcp_servers {
            let servers_map: HashMap<String, McpServerConfig> = servers
                .iter()
                .map(|(name, config)| (name.clone(), config.clone().into()))
                .collect();
            McpServers::Dict(servers_map)
        } else {
            McpServers::Empty
        };

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
            plugins,
            mcp_servers,
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

    // Ensure client is connected before sending (lazy connection)
    // connect() is idempotent - returns immediately if already connected
    {
        let mut client = client.lock().await;
        client.connect().await.map_err(|e| e.to_string())?;
    }

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

    // Don't connect immediately - defer connection until first message
    // This makes session creation instant (~0ms instead of ~6s)

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

    // Don't connect immediately - connection will happen on first message
    // This makes session resumption instant

    Ok(())
}

#[tauri::command]
pub fn cc_get_projects() -> Result<Vec<String>, String> {
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let claude_json = home.join(".claude.json");

    let content = fs::read_to_string(&claude_json)
        .map_err(|e| format!("Failed to read .claude.json: {}", e))?;

    let data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse .claude.json: {}", e))?;

    let projects = data.get("projects")
        .and_then(|p| p.as_object())
        .ok_or("No projects found in .claude.json")?;

    Ok(projects.keys().cloned().collect())
}

#[tauri::command]
pub fn cc_get_installed_skills() -> Result<Vec<String>, String> {
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let skills_dir = home.join(".claude").join("skills");

    if !skills_dir.exists() {
        return Ok(vec![]);
    }

    let mut skills = Vec::new();

    for entry in fs::read_dir(&skills_dir).map_err(|e| format!("Failed to read skills dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            // Check if SKILL.md exists
            if path.join("SKILL.md").exists() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    skills.push(name.to_string());
                }
            }
        }
    }

    skills.sort();
    Ok(skills)
}

#[tauri::command]
pub fn cc_get_sessions() -> Result<Vec<SessionData>, String> {
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
