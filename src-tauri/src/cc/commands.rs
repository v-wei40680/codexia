use super::db::SessionData;
use super::mcp::{
    ClaudeCodeMcpServer, ClaudeCodeResponse, cc_list_projects as mcp_cc_list_projects,
    cc_mcp_add as mcp_cc_mcp_add, cc_mcp_disable as mcp_cc_mcp_disable,
    cc_mcp_enable as mcp_cc_mcp_enable, cc_mcp_get as mcp_cc_mcp_get,
    cc_mcp_list as mcp_cc_mcp_list, cc_mcp_remove as mcp_cc_mcp_remove,
};
use super::services::{
    message_service, project_service, session_service, settings_service, skill_service,
};
use super::state::CCState;
use super::types::{AgentOptions, CCConnectParams};
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub async fn cc_connect(params: CCConnectParams, state: State<'_, CCState>) -> Result<(), String> {
    session_service::connect(params, &state).await
}

#[tauri::command]
pub async fn cc_send_message(
    session_id: String,
    message: String,
    app: AppHandle,
    state: State<'_, CCState>,
) -> Result<(), String> {
    let event_name = format!("cc-message:{}", session_id);

    message_service::send_message(&session_id, &message, &state, move |msg| {
        if let Err(e) = app.emit(&event_name, &msg) {
            log::error!("Failed to emit message: {}", e);
        }
    })
    .await
}

#[tauri::command]
pub async fn cc_disconnect(session_id: String, state: State<'_, CCState>) -> Result<(), String> {
    session_service::disconnect(&session_id, &state).await
}

#[tauri::command]
pub async fn cc_new_session(
    options: AgentOptions,
    state: State<'_, CCState>,
) -> Result<String, String> {
    session_service::new_session(options, &state).await
}

#[tauri::command]
pub async fn cc_interrupt(session_id: String, state: State<'_, CCState>) -> Result<(), String> {
    session_service::interrupt(&session_id, &state).await
}

#[tauri::command]
pub async fn cc_list_sessions(state: State<'_, CCState>) -> Result<Vec<String>, String> {
    session_service::list_sessions(&state).await
}

#[tauri::command]
pub async fn cc_resume_session(
    session_id: String,
    options: AgentOptions,
    app: AppHandle,
    state: State<'_, CCState>,
) -> Result<(), String> {
    let event_name = format!("cc-message:{}", session_id);

    session_service::resume_session(session_id, options, &state, move |msg| {
        if let Err(e) = app.emit(&event_name, &msg) {
            log::error!("Failed to emit historical message: {}", e);
        }
    })
    .await
}

#[tauri::command]
pub fn cc_get_projects() -> Result<Vec<String>, String> {
    project_service::get_projects()
}

#[tauri::command]
pub fn cc_get_installed_skills() -> Result<Vec<String>, String> {
    skill_service::get_installed_skills()
}

#[tauri::command]
pub fn cc_get_settings() -> Result<serde_json::Value, String> {
    settings_service::get_settings()
}

#[tauri::command]
pub fn cc_update_settings(settings: serde_json::Value) -> Result<(), String> {
    settings_service::update_settings(settings)
}

#[tauri::command]
pub fn cc_get_sessions() -> Result<Vec<SessionData>, String> {
    session_service::get_sessions()
}

#[tauri::command]
pub async fn cc_mcp_list(working_dir: String) -> Result<Vec<ClaudeCodeMcpServer>, String> {
    mcp_cc_mcp_list(working_dir).await
}

#[tauri::command]
pub async fn cc_mcp_get(name: String, working_dir: String) -> Result<ClaudeCodeMcpServer, String> {
    mcp_cc_mcp_get(name, working_dir).await
}

#[tauri::command]
pub async fn cc_mcp_add(
    request: ClaudeCodeMcpServer,
    working_dir: String,
) -> Result<ClaudeCodeResponse, String> {
    mcp_cc_mcp_add(request, working_dir).await
}

#[tauri::command]
pub async fn cc_mcp_remove(
    name: String,
    working_dir: String,
    scope: String,
) -> Result<ClaudeCodeResponse, String> {
    mcp_cc_mcp_remove(name, working_dir, scope).await
}

#[tauri::command]
pub async fn cc_list_projects() -> Result<Vec<String>, String> {
    mcp_cc_list_projects().await
}

#[tauri::command]
pub async fn cc_mcp_disable(
    name: String,
    working_dir: String,
) -> Result<ClaudeCodeResponse, String> {
    mcp_cc_mcp_disable(name, working_dir).await
}

#[tauri::command]
pub async fn cc_mcp_enable(
    name: String,
    working_dir: String,
) -> Result<ClaudeCodeResponse, String> {
    mcp_cc_mcp_enable(name, working_dir).await
}
