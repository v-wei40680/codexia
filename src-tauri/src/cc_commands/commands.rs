use super::state::CCState;
use super::db::SessionData;
use super::types::{CCConnectParams, AgentOptions};
use super::services::{session_service, message_service, settings_service, skill_service, project_service};
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub async fn cc_connect(
    params: CCConnectParams,
    state: State<'_, CCState>,
) -> Result<(), String> {
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

    message_service::send_message(
        &session_id,
        &message,
        &state,
        move |msg| {
            if let Err(e) = app.emit(&event_name, &msg) {
                log::error!("Failed to emit message: {}", e);
            }
        },
    ).await
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

    session_service::resume_session(
        session_id,
        options,
        &state,
        move |msg| {
            if let Err(e) = app.emit(&event_name, &msg) {
                log::error!("Failed to emit historical message: {}", e);
            }
        },
    ).await
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
