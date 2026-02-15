use axum::{Json, extract::State as AxumState, http::StatusCode, response::IntoResponse};
use codex_app_server_protocol::{
    CancelLoginAccountParams, CommandExecutionApprovalDecision, FileChangeApprovalDecision,
    FuzzyFileSearchParams, GetAccountParams, LoginAccountParams, ModelListParams, RequestId,
    ReviewStartParams, ThreadListParams, ThreadResumeParams, ThreadStartParams,
    TurnInterruptParams, TurnStartParams,
};
use serde::Deserialize;
use serde_json::{Value, json};

use super::types::{ErrorResponse, WebServerState};
use crate::codex::scan::{list_archived_threads_payload, list_threads_payload};
use crate::codex::utils::codex_home;
use crate::db::notes::Note;
use crate::db::{
    create_note as db_create_note, delete_note as db_delete_note,
    get_note_by_id as db_get_note_by_id, get_notes as db_get_notes,
    toggle_favorite as db_toggle_favorite, update_note as db_update_note,
};
use crate::filesystem::{
    directory_ops::{canonicalize_path, get_home_directory, read_directory, search_files},
    file_io::{delete_file, read_file, write_file},
    file_types::FileEntry,
};

#[derive(Deserialize)]
pub(super) struct ListThreadsRequest {
    #[serde(flatten)]
    params: ThreadListParams,
    cwd: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct ArchiveThreadParams {
    thread_id: String,
}

#[derive(Deserialize)]
pub(super) struct SkillsListParams {
    cwd: String,
}

#[derive(Deserialize)]
pub(super) struct CommandExecutionApprovalParams {
    request_id: RequestId,
    decision: CommandExecutionApprovalDecision,
}

#[derive(Deserialize)]
pub(super) struct FileChangeApprovalParams {
    request_id: RequestId,
    decision: FileChangeApprovalDecision,
}

#[derive(Deserialize)]
pub(super) struct UserInputResponseParams {
    request_id: RequestId,
    response: Value,
}

#[derive(Deserialize)]
pub(super) struct FilesystemPathParams {
    path: String,
}

#[derive(Deserialize)]
pub(super) struct FilesystemFilePathParams {
    #[serde(rename = "filePath")]
    file_path: String,
}

#[derive(Deserialize)]
pub(super) struct FilesystemWriteFileParams {
    #[serde(rename = "filePath")]
    file_path: String,
    content: String,
}

#[derive(Deserialize)]
pub(super) struct FilesystemSearchFilesParams {
    root: String,
    query: String,
    #[serde(default, rename = "exclude_folders", alias = "excludeFolders")]
    exclude_folders: Vec<String>,
    #[serde(default, rename = "max_results", alias = "maxResults")]
    max_results: Option<usize>,
}

#[derive(Deserialize)]
pub(super) struct NotesListParams {
    #[serde(default, alias = "userId")]
    user_id: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct CreateNoteParams {
    id: String,
    #[serde(default, alias = "userId")]
    user_id: Option<String>,
    title: String,
    content: String,
    #[serde(default)]
    tags: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub(super) struct GetNoteByIdParams {
    id: String,
}

#[derive(Deserialize)]
pub(super) struct UpdateNoteParams {
    id: String,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    content: Option<String>,
    #[serde(default)]
    tags: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub(super) struct DeleteNoteParams {
    id: String,
}

#[derive(Deserialize)]
pub(super) struct ToggleFavoriteParams {
    id: String,
}

pub(super) async fn api_start_thread(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<ThreadStartParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = serde_json::to_value(params).map_err(to_error_response)?;
    let result = state
        .codex_state
        .codex
        .send_request("thread/start", params_value)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_resume_thread(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<ThreadResumeParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = serde_json::to_value(params).map_err(to_error_response)?;
    let result = state
        .codex_state
        .codex
        .send_request("thread/resume", params_value)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_list_threads(
    AxumState(_state): AxumState<WebServerState>,
    Json(request): Json<ListThreadsRequest>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = serde_json::to_value(request.params).map_err(to_error_response)?;
    let result =
        list_threads_payload(params_value, request.cwd.as_deref()).map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_list_archived_threads(
    AxumState(_state): AxumState<WebServerState>,
    Json(params): Json<ThreadListParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = serde_json::to_value(params).map_err(to_error_response)?;
    let result = list_archived_threads_payload(params_value).map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_archive_thread(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<ArchiveThreadParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = json!({ "threadId": params.thread_id });
    let result = state
        .codex_state
        .codex
        .send_request("thread/archive", params_value)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_turn_start(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<TurnStartParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = serde_json::to_value(params).map_err(to_error_response)?;
    let result = state
        .codex_state
        .codex
        .send_request("turn/start", params_value)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_turn_interrupt(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<TurnInterruptParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = serde_json::to_value(params).map_err(to_error_response)?;
    let result = state
        .codex_state
        .codex
        .send_request("turn/interrupt", params_value)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_model_list(
    AxumState(state): AxumState<WebServerState>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = state
        .codex_state
        .codex
        .send_request("model/list", json!({}))
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_model_list_post(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<ModelListParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = serde_json::to_value(params).map_err(to_error_response)?;
    let result = state
        .codex_state
        .codex
        .send_request("model/list", params_value)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_account_rate_limits(
    AxumState(state): AxumState<WebServerState>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = state
        .codex_state
        .codex
        .send_request("account/rateLimits/read", Value::Null)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_get_account(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<GetAccountParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = serde_json::to_value(params).map_err(to_error_response)?;
    let result = state
        .codex_state
        .codex
        .send_request("account/read", params_value)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_login_account(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<LoginAccountParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = serde_json::to_value(params).map_err(to_error_response)?;
    let result = state
        .codex_state
        .codex
        .send_request("account/login/start", params_value)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_cancel_login_account(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CancelLoginAccountParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = serde_json::to_value(params).map_err(to_error_response)?;
    let result = state
        .codex_state
        .codex
        .send_request("account/login/cancel", params_value)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_logout_account(
    AxumState(state): AxumState<WebServerState>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = state
        .codex_state
        .codex
        .send_request("account/logout", Value::Null)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_skills_list(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<SkillsListParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = json!({ "cwds": [params.cwd] });
    let result = state
        .codex_state
        .codex
        .send_request("skills/list", params_value)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_respond_command_execution_approval(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CommandExecutionApprovalParams>,
) -> Result<StatusCode, ErrorResponse> {
    let result_value = serde_json::to_value(
        codex_app_server_protocol::CommandExecutionRequestApprovalResponse {
            decision: params.decision,
        },
    )
    .map_err(to_error_response)?;

    state
        .codex_state
        .codex
        .send_response(params.request_id, result_value)
        .await
        .map_err(to_error_response)?;

    Ok(StatusCode::OK)
}

pub(super) async fn api_respond_file_change_approval(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<FileChangeApprovalParams>,
) -> Result<StatusCode, ErrorResponse> {
    let result_value = serde_json::to_value(
        codex_app_server_protocol::FileChangeRequestApprovalResponse {
            decision: params.decision,
        },
    )
    .map_err(to_error_response)?;

    state
        .codex_state
        .codex
        .send_response(params.request_id, result_value)
        .await
        .map_err(to_error_response)?;

    Ok(StatusCode::OK)
}

pub(super) async fn api_respond_user_input(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<UserInputResponseParams>,
) -> Result<StatusCode, ErrorResponse> {
    let result_value = serde_json::to_value(params.response).map_err(to_error_response)?;

    state
        .codex_state
        .codex
        .send_response(params.request_id, result_value)
        .await
        .map_err(to_error_response)?;

    Ok(StatusCode::OK)
}

pub(super) async fn api_fuzzy_file_search(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<FuzzyFileSearchParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = serde_json::to_value(params).map_err(to_error_response)?;
    let result = state
        .codex_state
        .codex
        .send_request("fuzzyFileSearch", params_value)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_start_review(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<ReviewStartParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let params_value = serde_json::to_value(params).map_err(to_error_response)?;
    let result = state
        .codex_state
        .codex
        .send_request("review/start", params_value)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_read_directory(
    Json(params): Json<FilesystemPathParams>,
) -> Result<Json<Vec<FileEntry>>, ErrorResponse> {
    let entries = read_directory(params.path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(entries))
}

pub(super) async fn api_get_home_directory() -> Result<Json<String>, ErrorResponse> {
    let home = get_home_directory().await.map_err(to_error_response)?;
    Ok(Json(home))
}

pub(super) async fn api_canonicalize_path(
    Json(params): Json<FilesystemPathParams>,
) -> Result<Json<String>, ErrorResponse> {
    let path = canonicalize_path(params.path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(path))
}

pub(super) async fn api_search_files(
    Json(params): Json<FilesystemSearchFilesParams>,
) -> Result<Json<Vec<FileEntry>>, ErrorResponse> {
    let entries = search_files(
        params.root,
        params.query,
        params.exclude_folders,
        params.max_results,
    )
    .await
    .map_err(to_error_response)?;
    Ok(Json(entries))
}

pub(super) async fn api_read_file(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<Json<String>, ErrorResponse> {
    let content = read_file(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(content))
}

pub(super) async fn api_codex_home() -> Result<Json<String>, ErrorResponse> {
    let home = codex_home();
    Ok(Json(home.to_string_lossy().into_owned()))
}

pub(super) async fn api_write_file(
    Json(params): Json<FilesystemWriteFileParams>,
) -> Result<StatusCode, ErrorResponse> {
    write_file(params.file_path, params.content)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_delete_file(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<StatusCode, ErrorResponse> {
    delete_file(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_create_note(
    Json(params): Json<CreateNoteParams>,
) -> Result<Json<Note>, ErrorResponse> {
    let note = db_create_note(
        params.id,
        params.user_id,
        params.title,
        params.content,
        params.tags,
    )
    .map_err(to_error_response)?;
    Ok(Json(note))
}

pub(super) async fn api_get_notes(
    Json(params): Json<NotesListParams>,
) -> Result<Json<Vec<Note>>, ErrorResponse> {
    let notes = db_get_notes(params.user_id).map_err(to_error_response)?;
    Ok(Json(notes))
}

pub(super) async fn api_get_note_by_id(
    Json(params): Json<GetNoteByIdParams>,
) -> Result<Json<Option<Note>>, ErrorResponse> {
    let note = db_get_note_by_id(params.id).map_err(to_error_response)?;
    Ok(Json(note))
}

pub(super) async fn api_update_note(
    Json(params): Json<UpdateNoteParams>,
) -> Result<StatusCode, ErrorResponse> {
    db_update_note(params.id, params.title, params.content, params.tags)
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_delete_note(
    Json(params): Json<DeleteNoteParams>,
) -> Result<StatusCode, ErrorResponse> {
    db_delete_note(params.id).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_toggle_favorite(
    Json(params): Json<ToggleFavoriteParams>,
) -> Result<StatusCode, ErrorResponse> {
    db_toggle_favorite(params.id).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn health_check() -> impl IntoResponse {
    Json(json!({
        "status": "ok"
    }))
}

fn to_error_response(err: impl ToString) -> ErrorResponse {
    ErrorResponse {
        error: err.to_string(),
    }
}
