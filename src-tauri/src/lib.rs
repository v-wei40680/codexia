use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::{process::CommandChild, ShellExt};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::{mpsc, Mutex};
use uuid::Uuid;

mod codex_client;
use codex_client::*;

// Codex protocol types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Submission {
    pub id: String,
    pub op: Op,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Op {
    ConfigureSession {
        provider: ModelProvider,
        model: String,
        model_reasoning_effort: String,
        model_reasoning_summary: String,
        user_instructions: Option<String>,
        base_instructions: Option<String>,
        approval_policy: String,
        sandbox_policy: SandboxPolicy,
        disable_response_storage: bool,
        cwd: PathBuf,
        resume_path: Option<PathBuf>,
    },
    UserInput {
        items: Vec<InputItem>,
    },
    Interrupt,
    ExecApproval {
        id: String,
        decision: String,
    },
    PatchApproval {
        id: String,
        decision: String,
    },
    Shutdown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelProvider {
    pub name: String,
    pub base_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "kebab-case")]
pub enum SandboxPolicy {
    #[serde(rename = "read-only")]
    ReadOnly,
    #[serde(rename = "workspace-write")]
    WorkspaceWrite {
        #[serde(default)]
        writable_roots: Vec<PathBuf>,
        #[serde(default)]
        network_access: bool,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum InputItem {
    Text { text: String },
    Image { image_url: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub msg: EventMsg,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum EventMsg {
    SessionConfigured,
    TaskStarted,
    TaskComplete { response_id: Option<String> },
    AgentMessage { message: String },
    AgentMessageDelta { delta: String },
    ExecApprovalRequest {
        command: String,
        cwd: String,
    },
    PatchApprovalRequest {
        patch: String,
        files: Vec<String>,
    },
    Error { message: String },
    TurnComplete { response_id: Option<String> },
    // 新增的事件类型
    ExecCommandBegin {
        call_id: String,
        command: Vec<String>,
        cwd: String,
    },
    ExecCommandOutputDelta {
        call_id: String,
        stream: String,
        chunk: Vec<u8>,
    },
    ExecCommandEnd {
        call_id: String,
        stdout: String,
        stderr: String,
        exit_code: i32,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodexConfig {
    pub working_directory: String,
    pub model: String,
    pub provider: String,
    pub use_oss: bool,
    pub custom_args: Option<Vec<String>>,
    pub approval_policy: String,
    pub sandbox_mode: String,
}

// Tauri commands
#[tauri::command]
async fn start_codex_session(
    app: AppHandle,
    state: State<'_, CodexState>,
    session_id: String,
    config: CodexConfig,
) -> Result<(), String> {
    // Check if session already exists
    {
        let sessions = state.sessions.lock().await;
        if sessions.contains_key(&session_id) {
            return Ok(()); // Session already running
        }
    }
    
    let codex_client = CodexClient::new(&app, session_id.clone(), config).await
        .map_err(|e| format!("Failed to start codex: {}", e))?;
    
    state.sessions.lock().await.insert(session_id, codex_client);
    Ok(())
}

#[tauri::command]
async fn select_directory() -> Result<Option<String>, String> {
    // 简化版本，先返回当前目录
    Ok(Some("/Users/gpt/projects/rustapp/codexia".to_string()))
}

#[tauri::command]
async fn send_message(
    state: State<'_, CodexState>,
    session_id: String,
    message: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().await;
    if let Some(client) = sessions.get_mut(&session_id) {
        client.send_user_input(message).await
            .map_err(|e| format!("Failed to send message: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
async fn approve_execution(
    state: State<'_, CodexState>,
    session_id: String,
    approval_id: String,
    approved: bool,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().await;
    if let Some(client) = sessions.get_mut(&session_id) {
        client.send_exec_approval(approval_id, approved).await
            .map_err(|e| format!("Failed to send approval: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
async fn stop_session(
    state: State<'_, CodexState>,
    session_id: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().await;
    if let Some(mut client) = sessions.remove(&session_id) {
        client.shutdown().await
            .map_err(|e| format!("Failed to shutdown session: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
async fn get_running_sessions(
    state: State<'_, CodexState>,
) -> Result<Vec<String>, String> {
    let sessions = state.sessions.lock().await;
    Ok(sessions.keys().cloned().collect())
}

// State management
pub struct CodexState {
    sessions: Arc<Mutex<HashMap<String, CodexClient>>>,
}

impl CodexState {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(CodexState::new())
        .invoke_handler(tauri::generate_handler![
            start_codex_session,
            send_message,
            approve_execution,
            stop_session,
            select_directory,
            get_running_sessions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
