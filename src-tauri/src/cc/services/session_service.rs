use crate::cc::db::SessionDB;
use crate::cc::state::CCState;
use crate::cc::types::{AgentOptions, CCConnectParams, parse_permission_mode};
use claude_agent_sdk_rs::{
    ClaudeAgentOptions, HookInput, HookJsonOutput, HookSpecificOutput, Hooks, Message as SDKMessage,
    PreToolUseHookSpecificOutput, SyncHookJsonOutput,
};
use std::collections::HashSet;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use super::message_service;
use uuid;

pub use crate::cc::scan::get_sessions;

pub type CCEmitter = Arc<dyn Fn(String, serde_json::Value) + Send + Sync + 'static>;

/// Shared session-id that can be updated from temp UUID to real SDK session_id.
pub type SessionIdArc = Arc<Mutex<String>>;


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
    session_id: SessionIdArc,
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
            // The SDK always provides the real session_id in the hook input — use it
            // for the event payload so the frontend's sessionId check always matches.
            let sdk_session_id = pre_tool.session_id;
            let cwd = pre_tool.cwd;

            // Read current session_id from Arc for permission_mode lookup.
            let current_session_id = session_id.lock().unwrap().clone();

            // Always read permission mode fresh from state so runtime changes take effect.
            let permission_mode = state.get_permission_mode(&current_session_id);

            log::info!(
                "[cc permission hook] tool={} mode={:?} session={}",
                tool_name, permission_mode, current_session_id
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

            // Determine whether "always allow" should target project settings or session.
            // Use "project" whenever cwd is available (permission_storage creates the file).
            let always_allow_target = if !cwd.is_empty() { "project" } else { "session" };

            emitter("cc-permission-request".to_string(), serde_json::json!({
                "requestId": request_id,
                "sessionId": sdk_session_id,
                "toolName": tool_name,
                "toolInput": tool_input,
                "alwaysAllowTarget": always_allow_target,
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
                "allow_project" => {
                    if let Err(e) = super::permission_storage::add_project_allow_rule(&cwd, &tool_name) {
                        log::warn!("[cc permission hook] Failed to save project permission: {}", e);
                    }
                    permission_hook_output("allow", "Allowed and saved to project settings")
                }
                "allow" => permission_hook_output("allow", "Allowed by user"),
                _ => permission_hook_output("deny", "Denied by user"),
            }
        }
    });

    hooks.build()
}

pub async fn connect(params: CCConnectParams, state: &CCState, emitter: CCEmitter) -> Result<(), String> {
    let permission_mode = params.permission_mode.as_deref().and_then(parse_permission_mode);
    let permission_mode_str = params.permission_mode.clone();

    let mut options = ClaudeAgentOptions {
        cwd: Some(PathBuf::from(&params.cwd)),
        model: params.model,
        resume: params.resume_id,
        permission_mode,
        stderr_callback: Some(Arc::new(|msg| log::error!("[CC STDERR] {}", msg))),
        ..Default::default()
    };

    let session_id_arc: SessionIdArc = Arc::new(Mutex::new(params.session_id.clone()));
    if needs_permission_callback(permission_mode_str.as_deref()) {
        options.hooks = Some(build_permission_hooks(
            state.clone(), emitter, session_id_arc.clone(),
        ));
    }

    state.session_arcs.insert(params.session_id.clone(), session_id_arc);
    state.create_client(params.session_id.clone(), options, permission_mode_str).await?;

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
    let session_id_arc: SessionIdArc = Arc::new(Mutex::new(session_id.clone()));
    let permission_mode_str = options.permission_mode.clone();
    let mut claude_options = options.to_claude_options(None);

    if needs_permission_callback(permission_mode_str.as_deref()) {
        claude_options.hooks = Some(build_permission_hooks(
            state.clone(), emitter, session_id_arc.clone(),
        ));
    }

    state.session_arcs.insert(session_id.clone(), session_id_arc);
    state.create_client(session_id.clone(), claude_options, permission_mode_str).await?;
    Ok(session_id)
}

/// Create a new session, send the first message, and block until the real SDK session_id
/// is known (from `System::init`). Returns the real session_id so the frontend never
/// sees a temporary UUID.
pub async fn new_session_and_send(
    options: AgentOptions,
    initial_message: String,
    state: &CCState,
    emitter: CCEmitter,
) -> Result<String, String> {
    let temp_id = uuid::Uuid::new_v4().to_string();
    let session_id_arc: SessionIdArc = Arc::new(Mutex::new(temp_id.clone()));
    let permission_mode_str = options.permission_mode.clone();
    let mut claude_options = options.to_claude_options(None);

    if needs_permission_callback(permission_mode_str.as_deref()) {
        claude_options.hooks = Some(build_permission_hooks(
            state.clone(), emitter.clone(), session_id_arc.clone(),
        ));
    }

    state.session_arcs.insert(temp_id.clone(), session_id_arc.clone());
    state.create_client(temp_id.clone(), claude_options, permission_mode_str).await?;

    let (tx_real_id, rx_real_id) = tokio::sync::oneshot::channel::<String>();
    let tx_slot: Arc<Mutex<Option<tokio::sync::oneshot::Sender<String>>>> =
        Arc::new(Mutex::new(Some(tx_real_id)));

    let state_clone = state.clone();
    let emitter_clone = emitter;
    let session_id_arc_clone = session_id_arc;
    let temp_id_clone = temp_id.clone();

    message_service::send_message(
        &temp_id,
        &initial_message,
        state,
        move |msg| {
            let current_id = session_id_arc_clone.lock().unwrap().clone();

            // On System::init: resolve temp_id → real SDK session_id.
            if let SDKMessage::System(ref sys) = msg {
                if sys.subtype == "init" {
                    if let Some(ref real_id) = sys.session_id {
                        if real_id != &temp_id_clone {
                            *session_id_arc_clone.lock().unwrap() = real_id.clone();
                            state_clone.add_session_alias(real_id, &temp_id_clone);
                            if let Some(tx) = tx_slot.lock().unwrap().take() {
                                let _ = tx.send(real_id.clone());
                            }
                            // Emit on real channel so frontend receives this message.
                            let event_name = format!("cc-message:{}", real_id);
                            if let Ok(payload) = serde_json::to_value(&msg) {
                                println!("cc-message init:\n{}", payload);
                                emitter_clone(event_name, payload);
                            }
                            return;
                        }
                    }
                }
            }

            let event_name = format!("cc-message:{}", current_id);
            if let Ok(payload) = serde_json::to_value(&msg) {
                println!("cc-message:\n{}", payload);
                emitter_clone(event_name, payload);
            }
        },
    )
    .await?;

    // Wait for the real session_id from System::init with a timeout fallback.
    let real_id = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        rx_real_id,
    )
    .await
    .ok()
    .and_then(|r| r.ok())
    .unwrap_or_else(|| {
        log::warn!("[new_session_and_send] Timed out waiting for System::init, using temp_id");
        temp_id
    });

    Ok(real_id)
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
) -> Result<(), String> {
    // Replay historical messages from JSONL to the frontend as raw JSON values.
    // Using raw serde_json::Value avoids the SDK Message type losing user message content
    // (JSONL user messages use a nested `message.content` format the SDK doesn't model).
    let event_name = format!("cc-message:{}", session_id);
    if let Ok(db) = SessionDB::new() {
        if let Ok(Some(file_path)) = db.get_file_path(&session_id) {
            if let Ok(file) = fs::File::open(&file_path) {
                let reader = BufReader::new(file);
                for line in reader.lines().filter_map(|l| l.ok()) {
                    let sanitized = line.replace('\u{0000}', "").trim().to_string();
                    if sanitized.is_empty() || !sanitized.ends_with('}') { continue; }
                    if let Ok(mut val) = serde_json::from_str::<serde_json::Value>(&sanitized) {
                        let msg_type = val.get("type").and_then(|t| t.as_str()).unwrap_or("").to_string();
                        if !matches!(msg_type.as_str(), "user" | "assistant" | "system" | "result") {
                            continue;
                        }
                        // JSONL user messages use {"message":{"role":"user","content":"..."}}
                        // Normalize to SDK format with top-level `text` field.
                        if msg_type == "user" {
                            if let Some(content) = val.get("message").and_then(|m| m.get("content")).cloned() {
                                let obj = val.as_object_mut().unwrap();
                                match &content {
                                    serde_json::Value::String(s) => {
                                        obj.insert("text".to_string(), serde_json::Value::String(s.clone()));
                                    }
                                    serde_json::Value::Array(_) => {
                                        obj.insert("content".to_string(), content);
                                    }
                                    _ => {}
                                }
                                obj.remove("message");
                            }
                        }
                        emitter(event_name.clone(), val);
                    }
                }
            }
        }
    }

    let permission_mode_str = options.permission_mode.clone();
    let session_id_arc: SessionIdArc = Arc::new(Mutex::new(session_id.clone()));
    let mut claude_options = options.to_claude_options(None);

    if needs_permission_callback(permission_mode_str.as_deref()) {
        claude_options.hooks = Some(build_permission_hooks(
            state.clone(), emitter, session_id_arc.clone(),
        ));
    }

    state.session_arcs.insert(session_id.clone(), session_id_arc);
    state.create_client(session_id.clone(), claude_options, permission_mode_str).await?;
    Ok(())
}
