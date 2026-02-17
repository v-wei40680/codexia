use super::to_error_response;
use axum::{Json, http::StatusCode};
use serde::Deserialize;

use crate::features::git::{
    GitDiffStatsResponse, GitFileDiffMetaResponse, GitFileDiffResponse,
    GitPrepareThreadWorktreeResponse, GitStatusResponse, git_diff_stats, git_file_diff,
    git_file_diff_meta, git_prepare_thread_worktree, git_stage_files, git_status,
    git_unstage_files,
};
use crate::web_server::types::ErrorResponse;

#[derive(Deserialize)]
pub(crate) struct GitCwdParams {
    cwd: String,
}

#[derive(Deserialize)]
pub(crate) struct GitFileDiffParams {
    cwd: String,
    #[serde(rename = "filePath", alias = "file_path")]
    file_path: String,
    staged: bool,
}

#[derive(Deserialize)]
pub(crate) struct GitStageFilesParams {
    cwd: String,
    #[serde(rename = "filePaths", alias = "file_paths")]
    file_paths: Vec<String>,
}

#[derive(Deserialize)]
pub(crate) struct GitPrepareThreadWorktreeParams {
    cwd: String,
    #[serde(rename = "threadKey", alias = "thread_key")]
    thread_key: String,
}

pub(crate) async fn api_git_prepare_thread_worktree(
    Json(params): Json<GitPrepareThreadWorktreeParams>,
) -> Result<Json<GitPrepareThreadWorktreeResponse>, ErrorResponse> {
    let result = git_prepare_thread_worktree(params.cwd, params.thread_key)
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_status(
    Json(params): Json<GitCwdParams>,
) -> Result<Json<GitStatusResponse>, ErrorResponse> {
    let result = git_status(params.cwd).map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_file_diff(
    Json(params): Json<GitFileDiffParams>,
) -> Result<Json<GitFileDiffResponse>, ErrorResponse> {
    let result = git_file_diff(params.cwd, params.file_path, params.staged)
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_file_diff_meta(
    Json(params): Json<GitFileDiffParams>,
) -> Result<Json<GitFileDiffMetaResponse>, ErrorResponse> {
    let result = git_file_diff_meta(params.cwd, params.file_path, params.staged)
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_diff_stats(
    Json(params): Json<GitCwdParams>,
) -> Result<Json<GitDiffStatsResponse>, ErrorResponse> {
    let result = git_diff_stats(params.cwd).map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_git_stage_files(
    Json(params): Json<GitStageFilesParams>,
) -> Result<StatusCode, ErrorResponse> {
    git_stage_files(params.cwd, params.file_paths).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_git_unstage_files(
    Json(params): Json<GitStageFilesParams>,
) -> Result<StatusCode, ErrorResponse> {
    git_unstage_files(params.cwd, params.file_paths).map_err(to_error_response)?;
    Ok(StatusCode::OK)
}
