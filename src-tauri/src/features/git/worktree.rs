use anyhow::Result;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;

use crate::features::git::helpers::{open_repo, repo_root_path};
use crate::features::git::types::GitPrepareThreadWorktreeResponse;

pub fn clone(url: &str, path: &Path) -> Result<PathBuf> {
    if path.exists() {
        let git_dir = path.join(".git");
        if git_dir.exists() {
            return Ok(path.to_path_buf());
        }
        let is_empty = std::fs::read_dir(path)?.next().is_none();
        if !is_empty {
            anyhow::bail!(
                "target exists and is not an empty directory/git repository: {}",
                path.display()
            );
        }
    }

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let should_interrupt = AtomicBool::new(false);
    let mut prepare = gix::prepare_clone(url, path)?;

    let (mut checkout, _outcome) = prepare
        .fetch_then_checkout(gix::progress::Discard, &should_interrupt)
        .map_err(|e| anyhow::anyhow!("fetch_then_checkout failed: {}", e))?;

    let repo = checkout.main_worktree(gix::progress::Discard, &should_interrupt)?;
    drop(repo);

    let git_dir = path.join(".git");
    if !git_dir.exists() {
        anyhow::bail!(
            "clone appeared to succeed but .git directory not found at: {}",
            git_dir.display()
        );
    }

    Ok(path.to_path_buf())
}

fn clone_local_worktree(repo_root: &Path, worktree_path: &Path) -> Result<(), String> {
    let should_interrupt = AtomicBool::new(false);
    let mut prepare = gix::prepare_clone(repo_root.to_string_lossy().as_ref(), worktree_path)
        .map_err(|err| format!("Failed to prepare local clone: {err}"))?;
    let (mut checkout, _outcome) = prepare
        .fetch_then_checkout(gix::progress::Discard, &should_interrupt)
        .map_err(|err| format!("Local clone fetch+checkout failed: {err}"))?;
    let (cloned_repo, _checkout_outcome) = checkout
        .main_worktree(gix::progress::Discard, &should_interrupt)
        .map_err(|err| format!("Failed to materialize cloned worktree: {err}"))?;

    // Match `git worktree add --detach ... HEAD` by forcing detached HEAD to source HEAD commit.
    let source_repo = gix::discover(repo_root)
        .map_err(|err| format!("Failed to open source repository for HEAD: {err}"))?;
    let head_id = source_repo
        .head_id()
        .map_err(|err| format!("Failed to resolve source HEAD id: {err}"))?;
    let head_file = cloned_repo.git_dir().join("HEAD");
    std::fs::write(&head_file, format!("{}\n", head_id.detach()))
        .map_err(|err| format!("Failed to detach HEAD in cloned worktree: {err}"))?;
    Ok(())
}

fn sanitize_worktree_key(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
            out.push(ch);
        } else {
            out.push('-');
        }
    }
    let trimmed = out.trim_matches('-');
    if trimmed.is_empty() {
        "thread".to_string()
    } else {
        trimmed.to_string()
    }
}

pub fn git_prepare_thread_worktree(
    cwd: String,
    thread_key: String,
) -> Result<GitPrepareThreadWorktreeResponse, String> {
    let repo = open_repo(&cwd)?;
    let repo_root = repo_root_path(&repo)?;
    let safe_key = sanitize_worktree_key(&thread_key);
    let worktrees_dir = repo_root.join(".codexia").join("worktrees");
    std::fs::create_dir_all(&worktrees_dir)
        .map_err(|err| format!("Failed to create worktrees directory: {err}"))?;

    let worktree_path = worktrees_dir.join(safe_key);
    let repo_root_str = repo_root.to_string_lossy().to_string();
    let worktree_path_str = worktree_path.to_string_lossy().to_string();

    if worktree_path.join(".git").exists() || gix::discover(&worktree_path).is_ok() {
        return Ok(GitPrepareThreadWorktreeResponse {
            repo_root: repo_root_str,
            worktree_path: worktree_path_str,
            existed: true,
        });
    }

    clone_local_worktree(&repo_root, &worktree_path)?;

    Ok(GitPrepareThreadWorktreeResponse {
        repo_root: repo_root_str,
        worktree_path: worktree_path_str,
        existed: false,
    })
}
