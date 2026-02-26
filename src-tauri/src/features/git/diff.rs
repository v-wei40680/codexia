use crate::features::git::helpers::{
    head_blob_content, head_blob_size, index_blob_content, index_blob_size, open_repo, to_repo_relative_path,
    worktree_content, worktree_size,
};
use crate::features::git::stats::{staged_diff_stats, unstaged_diff_stats};
use crate::features::git::types::{
    GitDiffStatsResponse, GitFileDiffMetaResponse, GitFileDiffResponse,
};

pub fn git_file_diff(
    cwd: String,
    file_path: String,
    staged: bool,
) -> Result<GitFileDiffResponse, String> {
    let repo = open_repo(&cwd)?;
    let relative_path = to_repo_relative_path(&repo, &file_path)?;
    let index = repo
        .index_or_empty()
        .map_err(|err| format!("Failed to load git index: {err}"))?;

    let (old_content, new_content) = if staged {
        (
            head_blob_content(&repo, &relative_path)?.unwrap_or_default(),
            index_blob_content(&repo, &index, &relative_path)?.unwrap_or_default(),
        )
    } else {
        (
            index_blob_content(&repo, &index, &relative_path)?.unwrap_or_default(),
            worktree_content(&repo, &relative_path)?.unwrap_or_default(),
        )
    };

    Ok(GitFileDiffResponse {
        has_changes: old_content != new_content,
        old_content,
        new_content,
    })
}

pub fn git_file_diff_meta(
    cwd: String,
    file_path: String,
    staged: bool,
) -> Result<GitFileDiffMetaResponse, String> {
    let repo = open_repo(&cwd)?;
    let relative_path = to_repo_relative_path(&repo, &file_path)?;
    let index = repo
        .index_or_empty()
        .map_err(|err| format!("Failed to load git index: {err}"))?;

    let (old_bytes, new_bytes) = if staged {
        (
            head_blob_size(&repo, &relative_path)?.unwrap_or(0),
            index_blob_size(&repo, &index, &relative_path)?.unwrap_or(0),
        )
    } else {
        (
            index_blob_size(&repo, &index, &relative_path)?.unwrap_or(0),
            worktree_size(&repo, &relative_path)?.unwrap_or(0),
        )
    };

    Ok(GitFileDiffMetaResponse {
        old_bytes,
        new_bytes,
        total_bytes: old_bytes.saturating_add(new_bytes),
    })
}

pub fn git_diff_stats(cwd: String) -> Result<GitDiffStatsResponse, String> {
    let repo = open_repo(&cwd)?;
    let staged = staged_diff_stats(&repo)?;
    let unstaged = unstaged_diff_stats(&repo)?;
    Ok(GitDiffStatsResponse { staged, unstaged })
}
