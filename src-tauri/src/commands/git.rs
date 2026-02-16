pub use crate::features::git::{
    GitDiffStatsResponse, GitFileDiffMetaResponse, GitFileDiffResponse,
    GitPrepareThreadWorktreeResponse, GitStatusResponse,
};

#[tauri::command]
pub async fn git_prepare_thread_worktree(
    cwd: String,
    thread_key: String,
) -> Result<GitPrepareThreadWorktreeResponse, String> {
    crate::features::git::git_prepare_thread_worktree(cwd, thread_key)
}

#[tauri::command]
pub async fn git_status(cwd: String) -> Result<GitStatusResponse, String> {
    crate::features::git::git_status(cwd)
}

#[tauri::command]
pub async fn git_file_diff(
    cwd: String,
    file_path: String,
    staged: bool,
) -> Result<GitFileDiffResponse, String> {
    crate::features::git::git_file_diff(cwd, file_path, staged)
}

#[tauri::command]
pub async fn git_file_diff_meta(
    cwd: String,
    file_path: String,
    staged: bool,
) -> Result<GitFileDiffMetaResponse, String> {
    crate::features::git::git_file_diff_meta(cwd, file_path, staged)
}

#[tauri::command]
pub async fn git_diff_stats(cwd: String) -> Result<GitDiffStatsResponse, String> {
    crate::features::git::git_diff_stats(cwd)
}

#[tauri::command]
pub async fn git_stage_files(cwd: String, file_paths: Vec<String>) -> Result<(), String> {
    crate::features::git::git_stage_files(cwd, file_paths)
}

#[tauri::command]
pub async fn git_unstage_files(cwd: String, file_paths: Vec<String>) -> Result<(), String> {
    crate::features::git::git_unstage_files(cwd, file_paths)
}
