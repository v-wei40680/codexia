use super::to_error_response;
use axum::{Json, extract::State as AxumState, http::StatusCode};
use serde::Deserialize;

use crate::codex::utils::codex_home;
use crate::features::filesystem::{
    directory_ops::{canonicalize_path, get_home_directory, read_directory, search_files},
    file_io::{delete_file, read_file, read_text_file_lines, write_file},
    file_parsers::{pdf::read_pdf_content, xlsx::read_xlsx_content},
    file_types::FileEntry,
};
use crate::web_server::types::{ErrorResponse, WebServerState};
use crate::web_server::filesystem_watch;

#[derive(Deserialize)]
pub(crate) struct FilesystemPathParams {
    path: String,
}

#[derive(Deserialize)]
pub(crate) struct FilesystemFilePathParams {
    #[serde(rename = "filePath")]
    file_path: String,
}

#[derive(Deserialize)]
pub(crate) struct FilesystemWriteFileParams {
    #[serde(rename = "filePath")]
    file_path: String,
    content: String,
}

#[derive(Deserialize)]
pub(crate) struct FilesystemSearchFilesParams {
    root: String,
    query: String,
    #[serde(default, rename = "exclude_folders", alias = "excludeFolders")]
    exclude_folders: Vec<String>,
    #[serde(default, rename = "max_results", alias = "maxResults")]
    max_results: Option<usize>,
}
pub(crate) async fn api_read_directory(
    Json(params): Json<FilesystemPathParams>,
) -> Result<Json<Vec<FileEntry>>, ErrorResponse> {
    let entries = read_directory(params.path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(entries))
}

pub(crate) async fn api_get_home_directory() -> Result<Json<String>, ErrorResponse> {
    let home = get_home_directory().await.map_err(to_error_response)?;
    Ok(Json(home))
}

pub(crate) async fn api_canonicalize_path(
    Json(params): Json<FilesystemPathParams>,
) -> Result<Json<String>, ErrorResponse> {
    let path = canonicalize_path(params.path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(path))
}

pub(crate) async fn api_search_files(
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

pub(crate) async fn api_read_file(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<Json<String>, ErrorResponse> {
    let content = read_file(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(content))
}

pub(crate) async fn api_read_text_file_lines(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<Json<Vec<String>>, ErrorResponse> {
    let lines = read_text_file_lines(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(lines))
}

pub(crate) async fn api_read_pdf_content(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<Json<String>, ErrorResponse> {
    let content = read_pdf_content(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(content))
}

pub(crate) async fn api_read_xlsx_content(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<Json<String>, ErrorResponse> {
    let content = read_xlsx_content(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(Json(content))
}

pub(crate) async fn api_codex_home() -> Result<Json<String>, ErrorResponse> {
    let home = codex_home();
    Ok(Json(home.to_string_lossy().into_owned()))
}

pub(crate) async fn api_write_file(
    Json(params): Json<FilesystemWriteFileParams>,
) -> Result<StatusCode, ErrorResponse> {
    write_file(params.file_path, params.content)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_delete_file(
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<StatusCode, ErrorResponse> {
    delete_file(params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_start_watch_path(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<FilesystemPathParams>,
) -> Result<StatusCode, ErrorResponse> {
    filesystem_watch::start_watch_path(
        state.fs_watch_state.as_ref(),
        state.event_tx.clone(),
        params.path,
    )
    .await
    .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_stop_watch_path(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<FilesystemPathParams>,
) -> Result<StatusCode, ErrorResponse> {
    filesystem_watch::stop_watch_path(state.fs_watch_state.as_ref(), params.path)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_start_watch_file(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<StatusCode, ErrorResponse> {
    filesystem_watch::start_watch_file(
        state.fs_watch_state.as_ref(),
        state.event_tx.clone(),
        params.file_path,
    )
    .await
    .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_stop_watch_file(
    AxumState(state): AxumState<WebServerState>,
    Json(params): Json<FilesystemFilePathParams>,
) -> Result<StatusCode, ErrorResponse> {
    filesystem_watch::stop_watch_file(state.fs_watch_state.as_ref(), params.file_path)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}
