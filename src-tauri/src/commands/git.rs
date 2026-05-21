pub use crate::shared::git::{
    GitBranchInfoResponse, GitBranchListResponse, GitDiffStatsResponse, GitFileDiffMetaResponse,
    GitApplyWorktreeResponse, GitCreateWorktreeResponse, GitFileDiffResponse, GitStatusResponse,
    GitHasWorktreeChangesResponse,
};

use tokio::task::spawn_blocking;

#[tauri::command]
pub async fn git_branch_info(cwd: String) -> Result<GitBranchInfoResponse, String> {
    crate::shared::git::git_branch_info(cwd)
}

#[tauri::command]
pub async fn git_list_branches(cwd: String) -> Result<GitBranchListResponse, String> {
    crate::shared::git::git_list_branches(cwd)
}

#[tauri::command]
pub async fn git_create_branch(cwd: String, branch: String) -> Result<(), String> {
    crate::shared::git::git_create_branch(cwd, branch)
}

#[tauri::command]
pub async fn git_checkout_branch(cwd: String, branch: String) -> Result<(), String> {
    crate::shared::git::git_checkout_branch(cwd, branch)
}

#[tauri::command]
pub async fn git_create_worktree(
    cwd: String,
    worktree_key: String,
) -> Result<GitCreateWorktreeResponse, String> {
    spawn_blocking(move || crate::shared::git::git_create_worktree(cwd, worktree_key))
        .await
        .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub async fn git_remove_worktree(
    cwd: String,
    worktree_key: String,
) -> Result<(), String> {
    spawn_blocking(move || crate::shared::git::git_remove_worktree(cwd, worktree_key))
        .await
        .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub async fn git_apply_worktree_changes(
    cwd: String,
    worktree_key: String,
) -> Result<GitApplyWorktreeResponse, String> {
    spawn_blocking(move || crate::shared::git::git_apply_worktree_changes(cwd, worktree_key))
        .await
        .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub async fn git_has_worktree_changes(
    cwd: String,
    worktree_key: String,
) -> Result<GitHasWorktreeChangesResponse, String> {
    spawn_blocking(move || crate::shared::git::git_has_worktree_changes(cwd, worktree_key))
        .await
        .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub async fn git_status(cwd: String) -> Result<GitStatusResponse, String> {
    crate::shared::git::git_status(cwd)
}

#[tauri::command]
pub async fn git_file_diff(
    cwd: String,
    file_path: String,
    staged: bool,
) -> Result<GitFileDiffResponse, String> {
    crate::shared::git::git_file_diff(cwd, file_path, staged)
}

#[tauri::command]
pub async fn git_file_diff_meta(
    cwd: String,
    file_path: String,
    staged: bool,
) -> Result<GitFileDiffMetaResponse, String> {
    crate::shared::git::git_file_diff_meta(cwd, file_path, staged)
}

#[tauri::command]
pub async fn git_diff_stats(cwd: String) -> Result<GitDiffStatsResponse, String> {
    crate::shared::git::git_diff_stats(cwd)
}

#[tauri::command]
pub async fn git_stage_files(cwd: String, file_paths: Vec<String>) -> Result<(), String> {
    crate::shared::git::git_stage_files(cwd, file_paths)
}

#[tauri::command]
pub async fn git_unstage_files(cwd: String, file_paths: Vec<String>) -> Result<(), String> {
    crate::shared::git::git_unstage_files(cwd, file_paths)
}

#[tauri::command]
pub async fn git_reverse_files(
    cwd: String,
    file_paths: Vec<String>,
    staged: bool,
) -> Result<(), String> {
    crate::shared::git::git_reverse_files(cwd, file_paths, staged)
}

#[tauri::command]
pub async fn git_commit(cwd: String, message: String) -> Result<String, String> {
    crate::shared::git::git_commit(cwd, message)
}

#[tauri::command]
pub async fn git_push(
    cwd: String,
    remote: Option<String>,
    branch: Option<String>,
) -> Result<String, String> {
    crate::shared::git::git_push(cwd, remote, branch)
}
