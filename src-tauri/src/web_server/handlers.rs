use axum::{Json, extract::State as AxumState, http::StatusCode, response::IntoResponse};
use codex_app_server_protocol::{
    CommandExecutionApprovalDecision, FileChangeApprovalDecision, FuzzyFileSearchParams,
    GetAccountParams, LoginAccountParams, ModelListParams, RequestId, ReviewStartParams,
    ThreadListParams, ThreadResumeParams, ThreadStartParams, TurnInterruptParams, TurnStartParams,
};
use serde::Deserialize;
use serde_json::{Value, json};

use super::{
    terminal as web_terminal,
    types::{ErrorResponse, WebServerState},
};
use crate::cc_commands::db::SessionData;
use crate::cc_commands::services::{
    message_service as cc_message_service, project_service as cc_project_service,
    session_service as cc_session_service, settings_service as cc_settings_service,
    skill_service as cc_skill_service,
};
use crate::cc_commands::types::{AgentOptions, CCConnectParams};
use crate::codex::scan::{list_archived_threads_payload, list_threads_payload};
use crate::codex::utils::codex_home;
use crate::commands::{
    git as git_commands, mcp as mcp_commands, notes as notes_commands, usage as usage_commands,
};
use crate::db::notes::Note;
use crate::dxt::{
    check_manifests_exist, download_and_extract_manifests, load_manifest, load_manifests,
};
use crate::filesystem::{
    directory_ops::{canonicalize_path, get_home_directory, read_directory, search_files},
    file_io::{delete_file, read_file, read_text_file_lines, write_file},
    file_parsers::{pdf::read_pdf_content, xlsx::read_xlsx_content},
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
pub(super) struct SkillsConfigWriteParams {
    path: String,
    enabled: bool,
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

#[derive(Deserialize)]
pub(super) struct UnifiedMcpAddParams {
    #[serde(rename = "client_name", alias = "clientName")]
    client_name: String,
    path: Option<String>,
    #[serde(rename = "server_name", alias = "serverName")]
    server_name: String,
    #[serde(rename = "server_config", alias = "serverConfig")]
    server_config: Value,
    scope: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct UnifiedMcpRemoveParams {
    #[serde(rename = "client_name", alias = "clientName")]
    client_name: String,
    path: Option<String>,
    #[serde(rename = "server_name", alias = "serverName")]
    server_name: String,
    scope: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct UnifiedMcpToggleParams {
    #[serde(rename = "client_name", alias = "clientName")]
    client_name: String,
    path: Option<String>,
    #[serde(rename = "server_name", alias = "serverName")]
    server_name: String,
}

#[derive(Deserialize)]
pub(super) struct UnifiedMcpReadParams {
    #[serde(rename = "client_name", alias = "clientName")]
    client_name: String,
    path: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct DxtManifestParams {
    user: String,
    repo: String,
}

#[derive(Deserialize)]
pub(super) struct CcSessionIdParams {
    #[serde(rename = "session_id", alias = "sessionId")]
    session_id: String,
}

#[derive(Deserialize)]
pub(super) struct CcSendMessageParams {
    #[serde(rename = "session_id", alias = "sessionId")]
    session_id: String,
    message: String,
}

#[derive(Deserialize)]
pub(super) struct CcNewSessionParams {
    options: AgentOptions,
}

#[derive(Deserialize)]
pub(super) struct CcResumeSessionParams {
    #[serde(rename = "session_id", alias = "sessionId")]
    session_id: String,
    options: AgentOptions,
}

#[derive(Deserialize)]
pub(super) struct CcUpdateSettingsParams {
    settings: Value,
}

#[derive(Deserialize)]
pub(super) struct GitCwdParams {
    cwd: String,
}

#[derive(Deserialize)]
pub(super) struct GitFileDiffParams {
    cwd: String,
    #[serde(rename = "filePath", alias = "file_path")]
    file_path: String,
    staged: bool,
}

#[derive(Deserialize)]
pub(super) struct GitStageFilesParams {
    cwd: String,
    #[serde(rename = "filePaths", alias = "file_paths")]
    file_paths: Vec<String>,
}

#[derive(Deserialize)]
pub(super) struct GitPrepareThreadWorktreeParams {
    cwd: String,
    #[serde(rename = "threadKey", alias = "thread_key")]
    thread_key: String,
}

#[derive(Deserialize)]
pub(super) struct TerminalStartParams {
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
}

#[derive(Deserialize)]
pub(super) struct TerminalSessionParams {
    #[serde(rename = "session_id", alias = "sessionId")]
    session_id: String,
}

#[derive(Deserialize)]
pub(super) struct TerminalWriteParams {
    #[serde(rename = "session_id", alias = "sessionId")]
    session_id: String,
    data: String,
}

#[derive(Deserialize)]
pub(super) struct TerminalResizeParams {
    #[serde(rename = "session_id", alias = "sessionId")]
    session_id: String,
    cols: u16,
    rows: u16,
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

pub(super) async fn api_skills_config_write(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<SkillsConfigWriteParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let payload = json!({
        "path": params.path,
        "enabled": params.enabled,
    });
    let result = state
        .codex_state
        .codex
        .send_request("skills/config/write", payload)
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

pub(super) async fn api_cc_connect(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CCConnectParams>,
) -> Result<StatusCode, ErrorResponse> {
    cc_session_service::connect(params, state.cc_state.as_ref())
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_cc_send_message(
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

pub(super) async fn api_cc_disconnect(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CcSessionIdParams>,
) -> Result<StatusCode, ErrorResponse> {
    cc_session_service::disconnect(&params.session_id, state.cc_state.as_ref())
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_cc_new_session(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CcNewSessionParams>,
) -> Result<Json<String>, ErrorResponse> {
    let session_id = cc_session_service::new_session(params.options, state.cc_state.as_ref())
        .await
        .map_err(to_error_response)?;
    Ok(Json(session_id))
}

pub(super) async fn api_cc_interrupt(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<CcSessionIdParams>,
) -> Result<StatusCode, ErrorResponse> {
    cc_session_service::interrupt(&params.session_id, state.cc_state.as_ref())
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_cc_list_sessions(
    AxumState(state): AxumState<WebServerState>,
) -> Result<Json<Vec<String>>, ErrorResponse> {
    let sessions = cc_session_service::list_sessions(state.cc_state.as_ref())
        .await
        .map_err(to_error_response)?;
    Ok(Json(sessions))
}

pub(super) async fn api_cc_resume_session(
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

pub(super) async fn api_cc_get_projects() -> Result<Json<Vec<String>>, ErrorResponse> {
    let projects = cc_project_service::get_projects().map_err(to_error_response)?;
    Ok(Json(projects))
}

pub(super) async fn api_cc_get_installed_skills() -> Result<Json<Vec<String>>, ErrorResponse> {
    let skills = cc_skill_service::get_installed_skills().map_err(to_error_response)?;
    Ok(Json(skills))
}

pub(super) async fn api_cc_get_settings() -> Result<Json<Value>, ErrorResponse> {
    let settings = cc_settings_service::get_settings().map_err(to_error_response)?;
    Ok(Json(settings))
}

pub(super) async fn api_cc_update_settings(
    Json(params): Json<CcUpdateSettingsParams>,
) -> Result<StatusCode, ErrorResponse> {
    cc_settings_service::update_settings(params.settings).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_cc_get_sessions() -> Result<Json<Vec<SessionData>>, ErrorResponse> {
    let sessions = cc_session_service::get_sessions().map_err(to_error_response)?;
    Ok(Json(sessions))
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

pub(super) async fn api_read_text_file_lines(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<Json<Vec<String>>, ErrorResponse> {
    let lines = read_text_file_lines(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(lines))
}

pub(super) async fn api_read_pdf_content(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<Json<String>, ErrorResponse> {
    let content = read_pdf_content(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(content))
}

pub(super) async fn api_read_xlsx_content(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<Json<String>, ErrorResponse> {
    let content = read_xlsx_content(params.file_path)
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

pub(super) async fn api_terminal_start(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<TerminalStartParams>,
) -> Result<Json<web_terminal::TerminalStartResponse>, ErrorResponse> {
    let response = web_terminal::terminal_start(
        state.terminal_state.as_ref(),
        state.event_tx.clone(),
        params.cwd,
        params.cols,
        params.rows,
    )
    .await
    .map_err(to_error_response)?;
    Ok(Json(response))
}

pub(super) async fn api_terminal_write(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<TerminalWriteParams>,
) -> Result<StatusCode, ErrorResponse> {
    web_terminal::terminal_write(state.terminal_state.as_ref(), params.session_id, params.data)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_terminal_resize(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<TerminalResizeParams>,
) -> Result<StatusCode, ErrorResponse> {
    web_terminal::terminal_resize(
        state.terminal_state.as_ref(),
        params.session_id,
        params.cols,
        params.rows,
    )
    .await
    .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_terminal_stop(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<TerminalSessionParams>,
) -> Result<StatusCode, ErrorResponse> {
    web_terminal::terminal_stop(state.terminal_state.as_ref(), params.session_id)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_create_note(
    Json(params): Json<CreateNoteParams>,
) -> Result<Json<Note>, ErrorResponse> {
    let note = notes_commands::create_note(
        params.id,
        params.user_id,
        params.title,
        params.content,
        params.tags,
    )
    .await
    .map_err(to_error_response)?;
    Ok(Json(note))
}

pub(super) async fn api_get_notes(
    Json(params): Json<NotesListParams>,
) -> Result<Json<Vec<Note>>, ErrorResponse> {
    let notes = notes_commands::get_notes(params.user_id)
        .await
        .map_err(to_error_response)?;
    Ok(Json(notes))
}

pub(super) async fn api_get_note_by_id(
    Json(params): Json<GetNoteByIdParams>,
) -> Result<Json<Option<Note>>, ErrorResponse> {
    let note = notes_commands::get_note_by_id(params.id)
        .await
        .map_err(to_error_response)?;
    Ok(Json(note))
}

pub(super) async fn api_update_note(
    Json(params): Json<UpdateNoteParams>,
) -> Result<StatusCode, ErrorResponse> {
    notes_commands::update_note(params.id, params.title, params.content, params.tags)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_delete_note(
    Json(params): Json<DeleteNoteParams>,
) -> Result<StatusCode, ErrorResponse> {
    notes_commands::delete_note(params.id)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_toggle_favorite(
    Json(params): Json<ToggleFavoriteParams>,
) -> Result<StatusCode, ErrorResponse> {
    notes_commands::toggle_favorite(params.id)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_git_prepare_thread_worktree(
    Json(params): Json<GitPrepareThreadWorktreeParams>,
) -> Result<Json<git_commands::GitPrepareThreadWorktreeResponse>, ErrorResponse> {
    let result = git_commands::git_prepare_thread_worktree(params.cwd, params.thread_key)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_git_status(
    Json(params): Json<GitCwdParams>,
) -> Result<Json<git_commands::GitStatusResponse>, ErrorResponse> {
    let result = git_commands::git_status(params.cwd)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_git_file_diff(
    Json(params): Json<GitFileDiffParams>,
) -> Result<Json<git_commands::GitFileDiffResponse>, ErrorResponse> {
    let result = git_commands::git_file_diff(params.cwd, params.file_path, params.staged)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_git_file_diff_meta(
    Json(params): Json<GitFileDiffParams>,
) -> Result<Json<git_commands::GitFileDiffMetaResponse>, ErrorResponse> {
    let result = git_commands::git_file_diff_meta(params.cwd, params.file_path, params.staged)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_git_diff_stats(
    Json(params): Json<GitCwdParams>,
) -> Result<Json<git_commands::GitDiffStatsResponse>, ErrorResponse> {
    let result = git_commands::git_diff_stats(params.cwd)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_git_stage_files(
    Json(params): Json<GitStageFilesParams>,
) -> Result<StatusCode, ErrorResponse> {
    git_commands::git_stage_files(params.cwd, params.file_paths)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_git_unstage_files(
    Json(params): Json<GitStageFilesParams>,
) -> Result<StatusCode, ErrorResponse> {
    git_commands::git_unstage_files(params.cwd, params.file_paths)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_unified_add_mcp_server(
    Json(params): Json<UnifiedMcpAddParams>,
) -> Result<StatusCode, ErrorResponse> {
    mcp_commands::unified_add_mcp_server(
        params.client_name,
        params.path,
        params.server_name,
        params.server_config,
        params.scope,
    )
    .await
    .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_unified_remove_mcp_server(
    Json(params): Json<UnifiedMcpRemoveParams>,
) -> Result<StatusCode, ErrorResponse> {
    mcp_commands::unified_remove_mcp_server(
        params.client_name,
        params.path,
        params.server_name,
        params.scope,
    )
    .await
    .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_unified_enable_mcp_server(
    Json(params): Json<UnifiedMcpToggleParams>,
) -> Result<StatusCode, ErrorResponse> {
    mcp_commands::unified_enable_mcp_server(params.client_name, params.path, params.server_name)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_unified_disable_mcp_server(
    Json(params): Json<UnifiedMcpToggleParams>,
) -> Result<StatusCode, ErrorResponse> {
    mcp_commands::unified_disable_mcp_server(params.client_name, params.path, params.server_name)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_unified_read_mcp_config(
    Json(params): Json<UnifiedMcpReadParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let result = mcp_commands::unified_read_mcp_config(params.client_name, params.path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(super) async fn api_load_manifests() -> Result<Json<Value>, ErrorResponse> {
    let manifests = load_manifests().await.map_err(to_error_response)?;
    Ok(Json(manifests))
}

pub(super) async fn api_load_manifest(
    Json(params): Json<DxtManifestParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let manifest = load_manifest(params.user, params.repo)
        .await
        .map_err(to_error_response)?;
    Ok(Json(manifest))
}

pub(super) async fn api_check_manifests_exist() -> Result<Json<bool>, ErrorResponse> {
    let exists = check_manifests_exist().await.map_err(to_error_response)?;
    Ok(Json(exists))
}

pub(super) async fn api_download_and_extract_manifests() -> Result<StatusCode, ErrorResponse> {
    download_and_extract_manifests()
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(super) async fn api_read_token_usage() -> Result<Json<Vec<Value>>, ErrorResponse> {
    let usage = usage_commands::read_token_usage()
        .await
        .map_err(to_error_response)?;
    Ok(Json(usage))
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
