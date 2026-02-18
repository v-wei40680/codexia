use super::to_error_response;
use super::types::{CreateAutomationParams, DeleteAutomationParams, SetAutomationPausedParams};
use axum::{Json, extract::State as AxumState, http::StatusCode};

use crate::features::automation::{AutomationTask, list_automations};
use crate::web_server::types::{ErrorResponse, WebServerState};

pub(crate) async fn api_list_automations(
    AxumState(state): AxumState<WebServerState>,
) -> Result<Json<Vec<AutomationTask>>, ErrorResponse> {
    let tasks = list_automations(Some(state.codex_state.codex.clone()))
        .await
        .map_err(to_error_response)?;
    Ok(Json(tasks))
}

pub(crate) async fn api_create_automation(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CreateAutomationParams>,
) -> Result<Json<AutomationTask>, ErrorResponse> {
    let task = crate::features::automation::create_automation(
        params.name,
        params.projects,
        params.prompt,
        params.schedule,
        params.access_mode,
        Some(state.codex_state.codex.clone()),
    )
    .await
    .map_err(to_error_response)?;
    Ok(Json(task))
}

pub(crate) async fn api_set_automation_paused(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<SetAutomationPausedParams>,
) -> Result<Json<AutomationTask>, ErrorResponse> {
    let task = crate::features::automation::set_automation_paused(
        params.id,
        params.paused,
        Some(state.codex_state.codex.clone()),
    )
    .await
    .map_err(to_error_response)?;
    Ok(Json(task))
}

pub(crate) async fn api_delete_automation(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<DeleteAutomationParams>,
) -> Result<StatusCode, ErrorResponse> {
    crate::features::automation::delete_automation(params.id, Some(state.codex_state.codex.clone()))
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}
