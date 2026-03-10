use crate::cc::db::{SessionDB, SessionData};
use crate::cc::state::CCState;
use claude_agent_sdk_rs::{
    HookInput, HookJsonOutput, HookSpecificOutput, Hooks, Message, PreToolUseHookSpecificOutput,
    SyncHookJsonOutput,
};
use std::collections::HashSet;
use std::fs;
use std::io::{BufRead, BufReader};
use std::sync::{Arc, Mutex};
use uuid;

use super::super::{AgentOptions, CCConnectParams, parse_permission_mode};

pub type CCEmitter = Arc<dyn Fn(String, serde_json::Value) + Send + Sync + 'static>;

/// Tools that are always read-only — auto-approved in all modes except bypassPermissions
/// (which never reaches the hook). Read is included here but gated by sensitive file check.
const READ_ONLY_TOOLS: &[&str] = &["Glob", "Grep", "LS", "TodoRead"];

/// Tools auto-approved in `acceptEdits` mode (file write/edit operations).
const ACCEPT_EDITS_AUTO_APPROVE: &[&str] = &["Edit", "Write", "MultiEdit", "NotebookEdit"];

/// Filename patterns that are always considered sensitive — Read on these always asks.
const SENSITIVE_PATTERNS: &[&str] = &[
    ".env", ".env.", "id_rsa", "id_ed25519", "id_ecdsa", "id_dsa",
    ".pem", ".key", ".p12", ".pfx", ".secret",
];

fn is_sensitive_path(path: &str) -> bool {
    let lower = path.to_lowercase();
    // Match exact filename or prefix (e.g. .env.local, .env.production)
    let filename = std::path::Path::new(&lower)
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or(&lower);
    SENSITIVE_PATTERNS.iter().any(|pat| {
        if pat.ends_with('.') {
            // prefix match: .env. matches .env.local
            filename.starts_with(pat)
        } else {
            filename == *pat || filename.ends_with(pat)
        }
    })
}

/// Only `bypassPermissions` skips all prompts.
fn needs_permission_callback(permission_mode: Option<&str>) -> bool {
    !matches!(permission_mode, Some("bypassPermissions"))
}

fn permission_hook_output(decision: &str, reason: &str) -> HookJsonOutput {
    HookJsonOutput::Sync(SyncHookJsonOutput {
        hook_specific_output: Some(HookSpecificOutput::PreToolUse(PreToolUseHookSpecificOutput {
            permission_decision: Some(decision.to_string()),
            permission_decision_reason: Some(reason.to_string()),
            updated_input: None,
        })),
        ..Default::default()
    })
}

/// Build `PreToolUse` hooks that handle per-mode auto-approval and UI prompting.
///
/// IMPORTANT: permission_mode is intentionally NOT captured in the closure.
/// It is always read fresh from `state` on every invocation so that runtime
/// changes via `set_permission_mode` are reflected immediately.
fn build_permission_hooks(
    state: CCState,
    emitter: CCEmitter,
    session_id: String,
) -> std::collections::HashMap<
    claude_agent_sdk_rs::HookEvent,
    Vec<claude_agent_sdk_rs::HookMatcher>,
> {
    // Session-scoped always-allow set (populated when user clicks "Always Allow")
    let session_allowed: Arc<Mutex<HashSet<String>>> = Arc::new(Mutex::new(HashSet::new()));

    let mut hooks = Hooks::new();
    hooks.add_pre_tool_use(move |input, _tool_use_id, _ctx| {
        let state = state.clone();
        let emitter = emitter.clone();
        let session_id = session_id.clone();
        let session_allowed = session_allowed.clone();

        async move {
            let pre_tool = match input {
                HookInput::PreToolUse(v) => v,
                _ => return HookJsonOutput::Sync(Default::default()),
            };
            let tool_name = pre_tool.tool_name;
            let tool_input = pre_tool.tool_input;

            // Always read permission mode fresh from state so runtime changes take effect.
            let permission_mode = state.get_permission_mode(&session_id);

            log::info!(
                "[cc permission hook] tool={} mode={:?} session={}",
                tool_name, permission_mode, session_id
            );

            // bypassPermissions: allow everything (should not reach here, but guard anyway).
            if permission_mode.as_deref() == Some("bypassPermissions") {
                return permission_hook_output("allow", "bypassPermissions mode");
            }

            // Read is auto-approved unless it targets a sensitive file.
            if tool_name == "Read" {
                let file_path = tool_input
                    .get("file_path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if !is_sensitive_path(file_path) {
                    return permission_hook_output("allow", "Read on non-sensitive file");
                }
                // Fall through to UI prompt for sensitive files.
            }

            // Glob / Grep / LS / TodoRead — always safe, auto-approve.
            if READ_ONLY_TOOLS.contains(&tool_name.as_str()) {
                return permission_hook_output("allow", "Read-only tool, auto-approved");
            }

            // acceptEdits: auto-approve file write/edit tools.
            if permission_mode.as_deref() == Some("acceptEdits")
                && ACCEPT_EDITS_AUTO_APPROVE.contains(&tool_name.as_str())
            {
                return permission_hook_output("allow", "Auto-approved in acceptEdits mode");
            }

            // Check session-scoped always-allow (set when user clicks "Always Allow").
            if session_allowed.lock().unwrap().contains(&tool_name) {
                return permission_hook_output("allow", "Always allow for this session");
            }

            // Show UI prompt for everything else.
            let request_id = uuid::Uuid::new_v4().to_string();
            let (tx, rx) = tokio::sync::oneshot::channel::<String>();
            state.pending_permissions.insert(request_id.clone(), tx);

            log::info!(
                "[cc permission hook] emitting request: request_id={} tool={}",
                request_id, tool_name
            );

            emitter("cc-permission-request".to_string(), serde_json::json!({
                "requestId": request_id,
                "sessionId": session_id,
                "toolName": tool_name,
                "toolInput": tool_input,
            }));

            let decision = rx.await.unwrap_or_else(|_| "deny".to_string());
            log::info!(
                "[cc permission hook] resolved: request_id={} tool={} decision={}",
                request_id, tool_name, decision
            );

            match decision.as_str() {
                "allow_always" => {
                    session_allowed.lock().unwrap().insert(tool_name);
                    permission_hook_output("allow", "Allowed and saved for this session")
                }
                "allow" => permission_hook_output("allow", "Allowed by user"),
                _ => permission_hook_output("deny", "Denied by user"),
            }
        }
    });

    hooks.build()
}

pub async fn connect(params: CCConnectParams, state: &CCState, emitter: CCEmitter) -> Result<(), String> {
    let agent_options = AgentOptions {
        cwd: params.cwd,
        model: params.model,
        permission_mode: params.permission_mode,
        ..Default::default()
    };

    let mut options = agent_options.to_claude_options(params.resume_id);

    if needs_permission_callback(agent_options.permission_mode.as_deref()) {
        options.hooks = Some(build_permission_hooks(
            state.clone(), emitter, params.session_id.clone(),
        ));
    }

    state.create_client(params.session_id.clone(), options, agent_options.permission_mode.clone()).await?;

    let client = state.get_client(&params.session_id).await.ok_or("Failed to get client")?;
    let mut client = client.lock().await;
    client.connect().await.map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn disconnect(session_id: &str, state: &CCState) -> Result<(), String> {
    state.remove_client(session_id).await
}

pub async fn new_session_with_emitter(
    options: AgentOptions,
    state: &CCState,
    emitter: CCEmitter,
) -> Result<String, String> {
    let session_id = uuid::Uuid::new_v4().to_string();
    let mut claude_options = options.to_claude_options(None);

    if needs_permission_callback(options.permission_mode.as_deref()) {
        claude_options.hooks = Some(build_permission_hooks(
            state.clone(), emitter, session_id.clone(),
        ));
    }

    state.create_client(session_id.clone(), claude_options, options.permission_mode.clone()).await?;
    Ok(session_id)
}

pub async fn set_permission_mode(session_id: &str, mode: &str, state: &CCState) -> Result<(), String> {
    let permission_mode = parse_permission_mode(mode).ok_or("Invalid permission mode")?;

    // Update session metadata — the hook closure reads this on every invocation.
    state.set_permission_mode(session_id, mode.to_string());

    // Also forward to CLI so it respects the new mode for its own internal decisions.
    let client = state.get_client(session_id).await.ok_or("Client not found")?;
    let client = client.lock().await;
    client.set_permission_mode(permission_mode).await.map_err(|e| e.to_string())
}

pub async fn interrupt(session_id: &str, state: &CCState) -> Result<(), String> {
    let client = state.get_client(session_id).await.ok_or("Client not found")?;
    let client = client.lock().await;
    client.interrupt().await.map_err(|e| e.to_string())
}

pub async fn list_sessions(state: &CCState) -> Result<Vec<String>, String> {
    let clients = state.clients.lock().await;
    Ok(clients.keys().cloned().collect())
}

pub async fn resume_session(
    session_id: String,
    options: AgentOptions,
    state: &CCState,
    emitter: CCEmitter,
    message_callback: impl Fn(Message) + Send + 'static,
) -> Result<(), String> {
    let dir = options.cwd.replace("/", "-").replace("\\", "-");
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let history_path = home
        .join(".claude").join("projects").join(&dir)
        .join(format!("{}.jsonl", session_id));

    if history_path.exists() {
        let file = fs::File::open(&history_path)
            .map_err(|e| format!("Failed to open history file: {}", e))?;
        let reader = std::io::BufReader::new(file);
        for line in reader.lines() {
            let line = line.map_err(|e| format!("Failed to read line: {}", e))?;
            let sanitized = line.replace('\u{0000}', "").trim().to_string();
            if sanitized.is_empty() || !sanitized.ends_with('}') { continue; }
            if let Ok(msg) = serde_json::from_str::<Message>(&sanitized) {
                message_callback(msg);
            }
        }
    }

    let mut claude_options = options.to_claude_options(Some(session_id.clone()));

    if needs_permission_callback(options.permission_mode.as_deref()) {
        claude_options.hooks = Some(build_permission_hooks(
            state.clone(), emitter, session_id.clone(),
        ));
    }

    state.create_client(session_id.clone(), claude_options, options.permission_mode.clone()).await?;
    Ok(())
}

pub fn get_sessions() -> Result<Vec<SessionData>, String> {
    let db = SessionDB::new().map_err(|e| format!("Failed to open database: {}", e))?;
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let projects_dir = home.join(".claude").join("projects");

    if !projects_dir.exists() { return Ok(vec![]); }

    let slash_commands: Vec<&str> = vec!["/ide", "/model", "/status"];

    for entry in fs::read_dir(&projects_dir).map_err(|e| format!("Failed to read projects dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let project_dir = entry.path();
        if !project_dir.is_dir() { continue; }

        for session_entry in fs::read_dir(&project_dir).map_err(|e| format!("Failed to read project dir: {}", e))? {
            let session_entry = session_entry.map_err(|e| format!("Failed to read session entry: {}", e))?;
            let session_path = session_entry.path();

            if session_path.extension().and_then(|s| s.to_str()) != Some("jsonl") { continue; }

            let file_name = session_path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if file_name.starts_with("agent-") { continue; }

            let file_path_str = session_path.to_str().unwrap_or("");
            if db.is_scanned(file_path_str).unwrap_or(false) { continue; }

            if let Ok(file) = fs::File::open(&session_path) {
                let reader = BufReader::new(file);
                let mut session_id = String::new();
                let mut cwd = String::new();
                let mut timestamp: i64 = 0;
                let mut display = String::from("Untitled");
                let mut found_user_message = false;

                for line in reader.lines().filter_map(|l| l.ok()) {
                    let sanitized = line.replace('\u{0000}', "").trim().to_string();
                    if sanitized.is_empty() || !sanitized.ends_with('}') { continue; }

                    if let Ok(data) = serde_json::from_str::<serde_json::Value>(&sanitized) {
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
                                if slash_commands.contains(&msg_display.trim()) { break; }
                                display = msg_display.lines().next().unwrap_or("Untitled").to_string();
                                found_user_message = true;
                                break;
                            }
                        }
                    }
                }

                if found_user_message && !session_id.is_empty() && !cwd.is_empty() {
                    let session = SessionData { session_id, project: cwd, display, timestamp };
                    let _ = db.insert_session(&session, file_path_str);
                }
            }
        }
    }

    db.get_all_sessions().map_err(|e| format!("Failed to get sessions: {}", e))
}
