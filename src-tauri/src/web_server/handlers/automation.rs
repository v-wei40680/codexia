use super::to_error_response;
use super::types::{
    CreateAutomationParams, DeleteAutomationParams, ListAutomationRunsParams, RunAutomationNowParams, SetAutomationPausedParams,
    UpdateAutomationParams,
};
use axum::{Json, extract::State as AxumState, http::StatusCode};

use crate::features::automation::{AutomationRunRecord, AutomationTask, list_automations};
use crate::web_server::types::{ErrorResponse, WebServerState};

pub(crate) async fn api_list_automations(
    AxumState(state): AxumState<WebServerState>,
) -> Result<Json<Vec<AutomationTask>>, ErrorResponse> {
    let tasks = list_automations(
        Some(state.codex_state.codex.clone()),
        Some(state.cc_state.as_ref().clone()),
    )
        .await
        .map_err(to_error_response)?;
    Ok(Json(tasks))
}
pub(crate) async fn api_list_automation_runs(
    Json(params): Json<ListAutomationRunsParams>,
) -> Result<Json<Vec<AutomationRunRecord>>, ErrorResponse> {
    let runs = crate::features::automation::list_automation_runs(params.task_id, params.limit)
        .await
        .map_err(to_error_response)?;
    Ok(Json(runs))
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
        params.agent,
        params.model_provider,
        params.model,
        Some(state.codex_state.codex.clone()),
        Some(state.cc_state.as_ref().clone()),
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
        Some(state.cc_state.as_ref().clone()),
    )
    .await
    .map_err(to_error_response)?;
    Ok(Json(task))
}

pub(crate) async fn api_update_automation(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<UpdateAutomationParams>,
) -> Result<Json<AutomationTask>, ErrorResponse> {
    let task = crate::features::automation::update_automation(
        params.id,
        params.name,
        params.projects,
        params.prompt,
        params.schedule,
        params.agent,
        params.model_provider,
        params.model,
        Some(state.codex_state.codex.clone()),
        Some(state.cc_state.as_ref().clone()),
    )
    .await
    .map_err(to_error_response)?;
    Ok(Json(task))
}

pub(crate) async fn api_delete_automation(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<DeleteAutomationParams>,
) -> Result<StatusCode, ErrorResponse> {
    crate::features::automation::delete_automation(
        params.id,
        Some(state.codex_state.codex.clone()),
        Some(state.cc_state.as_ref().clone()),
    )
    .await
    .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_run_automation_now(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<RunAutomationNowParams>,
) -> Result<StatusCode, ErrorResponse> {
    crate::features::automation::run_automation_now(
        params.id,
        Some(state.codex_state.codex.clone()),
        Some(state.cc_state.as_ref().clone()),
    )
    .await
    .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}
