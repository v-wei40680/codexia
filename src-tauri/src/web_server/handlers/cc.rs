use super::to_error_response;
use super::types::{
    CcMcpAddParams, CcMcpGetParams, CcMcpListParams, CcMcpRemoveParams, CcMcpToggleParams,
    CcNewSessionParams, CcResumeSessionParams, CcSendMessageParams, CcSessionIdParams,
    CcUpdateSettingsParams,
};
use axum::{Json, extract::State as AxumState, http::StatusCode};
use serde_json::Value;
use crate::web_server::types::{ErrorResponse, WebServerState};

use crate::cc::db::SessionData;
use crate::cc::mcp::{self as cc_mcp_commands, ClaudeCodeMcpServer, ClaudeCodeResponse};
use crate::cc::services::{
    message_service as cc_message_service, project_service as cc_project_service,
    session_service as cc_session_service, settings_service as cc_settings_service,
    skill_service as cc_skill_service,
};
use crate::cc::types::CCConnectParams;

pub(crate) async fn api_cc_connect(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CCConnectParams>,
) -> Result<StatusCode, ErrorResponse> {
    cc_session_service::connect(params, state.cc_state.as_ref())
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_cc_send_message(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CcSendMessageParams>,
) -> Result<StatusCode, ErrorResponse> {
    let event_name = format!("cc-message:{}", params.session_id);
    let event_tx = state.event_tx.clone();

    cc_message_service::send_message(
        &params.session_id,
        &params.message,
        state.cc_state.as_ref(),
        move |msg| match serde_json::to_value(msg) {
            Ok(payload) => {
                if event_tx.send((event_name.clone(), payload)).is_err() {
                    log::debug!("No subscribers for CC event {}", event_name);
                }
            }
            Err(err) => {
                log::error!("Failed to serialize CC message event: {}", err);
            }
        },
    )
    .await
    .map_err(to_error_response)?;

    Ok(StatusCode::OK)
}

pub(crate) async fn api_cc_disconnect(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CcSessionIdParams>,
) -> Result<StatusCode, ErrorResponse> {
    cc_session_service::disconnect(&params.session_id, state.cc_state.as_ref())
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_cc_new_session(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CcNewSessionParams>,
) -> Result<Json<String>, ErrorResponse> {
    let session_id = cc_session_service::new_session(params.options, state.cc_state.as_ref())
        .await
        .map_err(to_error_response)?;
    Ok(Json(session_id))
}

pub(crate) async fn api_cc_interrupt(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CcSessionIdParams>,
) -> Result<StatusCode, ErrorResponse> {
    cc_session_service::interrupt(&params.session_id, state.cc_state.as_ref())
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_cc_list_sessions(
    AxumState(state): AxumState<WebServerState>,
) -> Result<Json<Vec<String>>, ErrorResponse> {
    let sessions = cc_session_service::list_sessions(state.cc_state.as_ref())
        .await
        .map_err(to_error_response)?;
    Ok(Json(sessions))
}

pub(crate) async fn api_cc_resume_session(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CcResumeSessionParams>,
) -> Result<StatusCode, ErrorResponse> {
    let event_name = format!("cc-message:{}", params.session_id);
    let event_tx = state.event_tx.clone();
    let session_id = params.session_id;
    let options = params.options;

    cc_session_service::resume_session(
        session_id.clone(),
        options,
        state.cc_state.as_ref(),
        move |msg| match serde_json::to_value(msg) {
            Ok(payload) => {
                if event_tx.send((event_name.clone(), payload)).is_err() {
                    log::debug!("No subscribers for CC event {}", event_name);
                }
            }
            Err(err) => {
                log::error!("Failed to serialize CC history event: {}", err);
            }
        },
    )
    .await
    .map_err(to_error_response)?;

    Ok(StatusCode::OK)
}

pub(crate) async fn api_cc_get_projects() -> Result<Json<Vec<String>>, ErrorResponse> {
    let projects = cc_project_service::get_projects().map_err(to_error_response)?;
    Ok(Json(projects))
}

pub(crate) async fn api_cc_get_installed_skills() -> Result<Json<Vec<String>>, ErrorResponse> {
    let skills = cc_skill_service::get_installed_skills().map_err(to_error_response)?;
    Ok(Json(skills))
}

pub(crate) async fn api_cc_get_settings() -> Result<Json<Value>, ErrorResponse> {
    let settings = cc_settings_service::get_settings().map_err(to_error_response)?;
    Ok(Json(settings))
}

pub(crate) async fn api_cc_update_settings(
    Json(params): Json<CcUpdateSettingsParams>,
) -> Result<StatusCode, ErrorResponse> {
    cc_settings_service::update_settings(params.settings).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_cc_get_sessions() -> Result<Json<Vec<SessionData>>, ErrorResponse> {
    let sessions = cc_session_service::get_sessions().map_err(to_error_response)?;
    Ok(Json(sessions))
}
pub(crate) async fn api_cc_mcp_list(
    Json(params): Json<CcMcpListParams>,
) -> Result<Json<Vec<ClaudeCodeMcpServer>>, ErrorResponse> {
    let servers = cc_mcp_commands::cc_mcp_list(params.working_dir)
        .await
        .map_err(to_error_response)?;
    Ok(Json(servers))
}

pub(crate) async fn api_cc_mcp_get(
    Json(params): Json<CcMcpGetParams>,
) -> Result<Json<ClaudeCodeMcpServer>, ErrorResponse> {
    let server = cc_mcp_commands::cc_mcp_get(params.name, params.working_dir)
        .await
        .map_err(to_error_response)?;
    Ok(Json(server))
}

pub(crate) async fn api_cc_mcp_add(
    Json(params): Json<CcMcpAddParams>,
) -> Result<Json<ClaudeCodeResponse>, ErrorResponse> {
    let response = cc_mcp_commands::cc_mcp_add(params.request, params.working_dir)
        .await
        .map_err(to_error_response)?;
    Ok(Json(response))
}

pub(crate) async fn api_cc_mcp_remove(
    Json(params): Json<CcMcpRemoveParams>,
) -> Result<Json<ClaudeCodeResponse>, ErrorResponse> {
    let response = cc_mcp_commands::cc_mcp_remove(params.name, params.working_dir, params.scope)
        .await
        .map_err(to_error_response)?;
    Ok(Json(response))
}

pub(crate) async fn api_cc_list_projects() -> Result<Json<Vec<String>>, ErrorResponse> {
    let projects = cc_mcp_commands::cc_list_projects()
        .await
        .map_err(to_error_response)?;
    Ok(Json(projects))
}

pub(crate) async fn api_cc_mcp_disable(
    Json(params): Json<CcMcpToggleParams>,
) -> Result<Json<ClaudeCodeResponse>, ErrorResponse> {
    let response = cc_mcp_commands::cc_mcp_disable(params.name, params.working_dir)
        .await
        .map_err(to_error_response)?;
    Ok(Json(response))
}

pub(crate) async fn api_cc_mcp_enable(
    Json(params): Json<CcMcpToggleParams>,
) -> Result<Json<ClaudeCodeResponse>, ErrorResponse> {
    let response = cc_mcp_commands::cc_mcp_enable(params.name, params.working_dir)
        .await
        .map_err(to_error_response)?;
    Ok(Json(response))
}
