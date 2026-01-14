use serde_json::json;
use tauri::State;
use tokio::process::Command;
use std::collections::HashMap;

use crate::codex::v2::state::AppState;
use crate::codex::v2::types::{
    BranchInfo, GitFileDiff, GitFileStatus, GitHubIssue, GitHubIssuesResponse, GitLogEntry,
    GitLogResponse,
};
use crate::codex::v2::utils::normalize_git_path;

async fn run_git(cwd: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .await
        .map_err(|e| format!("Failed to run git {}: {}", args.join(" "), e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Special case for some commands that might fail gracefully
        return Err(stderr.trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn parse_github_repo(remote_url: &str) -> Option<String> {
    let trimmed = remote_url.trim();
    if trimmed.is_empty() {
        return None;
    }
    let mut path = if trimmed.starts_with("git@github.com:") {
        trimmed.trim_start_matches("git@github.com:").to_string()
    } else if trimmed.starts_with("ssh://git@github.com/") {
        trimmed.trim_start_matches("ssh://git@github.com/").to_string()
    } else if let Some(index) = trimmed.find("github.com/") {
        trimmed[index + "github.com/".len()..].to_string()
    } else {
        return None;
    };
    path = path.trim_end_matches(".git").trim_end_matches('/').to_string();
    if path.is_empty() {
        None
    } else {
        Some(path)
    }
}

#[tauri::command]
pub(crate) async fn get_git_status_v2(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let workspaces = state.workspaces.lock().await;
    let entry = workspaces
        .get(&workspace_id)
        .ok_or("workspace not found")?
        .clone();

    let path = &entry.path;

    let branch_name = run_git(path, &["rev-parse", "--abbrev-ref", "HEAD"])
        .await
        .unwrap_or_else(|_| "unknown".to_string())
        .trim()
        .to_string();

    let status_output = run_git(path, &["status", "--porcelain"])
        .await
        .map_err(|e| format!("Failed to get git status: {}", e))?;

    // Get additions/deletions for tracked files
    let numstat_output = run_git(path, &["diff", "--numstat", "HEAD"])
        .await
        .unwrap_or_default();

    let mut stats_map = HashMap::new();
    for line in numstat_output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            let additions = parts[0].parse::<i64>().unwrap_or(0);
            let deletions = parts[1].parse::<i64>().unwrap_or(0);
            let file_path = parts[2..].join(" ");
            stats_map.insert(file_path, (additions, deletions));
        }
    }

    let mut files = Vec::new();
    let mut total_additions = 0i64;
    let mut total_deletions = 0i64;

    for line in status_output.lines() {
        if line.len() < 4 {
            continue;
        }
        let status_code = &line[..2];
        let file_path = line[3..].trim_matches('"').to_string();
        
        // Handle renames: "R  old -> new"
        let (actual_path, status_str) = if status_code.starts_with('R') {
            if let Some(pos) = file_path.find(" -> ") {
                (file_path[pos + 4..].to_string(), "R")
            } else {
                (file_path, "R")
            }
        } else if status_code.contains('?') {
            (file_path, "A") // Untracked is shown as "A" in the UI usually
        } else if status_code.contains('A') {
            (file_path, "A")
        } else if status_code.contains('M') {
            (file_path, "M")
        } else if status_code.contains('D') {
            (file_path, "D")
        } else if status_code.contains('T') {
            (file_path, "T")
        } else {
            (file_path, "--")
        };

        let (additions, deletions) = if status_code == "??" {
            // For untracked files, we can count lines if we want to show additions
            // But let's see if we can get it from git
            let content = tokio::fs::read_to_string(format!("{}/{}", path, actual_path))
                .await
                .unwrap_or_default();
            (content.lines().count() as i64, 0i64)
        } else {
            *stats_map.get(&actual_path).unwrap_or(&(0i64, 0i64))
        };

        total_additions += additions;
        total_deletions += deletions;

        files.push(GitFileStatus {
            path: normalize_git_path(&actual_path),
            status: status_str.to_string(),
            additions,
            deletions,
        });
    }

    Ok(json!({
        "branchName": branch_name,
        "files": files,
        "totalAdditions": total_additions,
        "totalDeletions": total_deletions,
    }))
}

#[tauri::command]
pub(crate) async fn get_git_diffs(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<GitFileDiff>, String> {
    let workspaces = state.workspaces.lock().await;
    let entry = workspaces
        .get(&workspace_id)
        .ok_or("workspace not found")?
        .clone();

    let path = &entry.path;

    // 1. Get diff for tracked files (staged + unstaged)
    let diff_output = run_git(path, &["diff", "HEAD"])
        .await
        .unwrap_or_default();

    let mut results = Vec::new();
    
    // Parse the unified diff output into individual files
    // This is a bit complex manually, but we can also use `git diff HEAD -- <file>` for each file
    // Or just split the big diff. Splitting by `diff --git ` is common.
    
    if !diff_output.is_empty() {
        let mut current_file = String::new();
        let mut current_diff = String::new();
        
        for line in diff_output.lines() {
            if line.starts_with("diff --git ") {
                if !current_file.is_empty() && !current_diff.is_empty() {
                    results.push(GitFileDiff {
                        path: normalize_git_path(&current_file),
                        diff: current_diff.clone(),
                    });
                }
                // Parse file name from "diff --git a/path/to/file b/path/to/file"
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    let b_path = parts[3];
                    current_file = b_path[2..].to_string();
                }
                current_diff = line.to_string() + "\n";
            } else {
                current_diff.push_str(line);
                current_diff.push('\n');
            }
        }
        if !current_file.is_empty() && !current_diff.is_empty() {
            results.push(GitFileDiff {
                path: normalize_git_path(&current_file),
                diff: current_diff,
            });
        }
    }

    // 2. Get diff for untracked files
    let status_output = run_git(path, &["status", "--porcelain"])
        .await
        .unwrap_or_default();

    for line in status_output.lines() {
        if line.starts_with("?? ") {
            let file_path = line[3..].trim_matches('"').to_string();
            // Generate a fake diff for untracked files
            match run_git(path, &["diff", "--no-index", "/dev/null", &file_path]).await {
                Ok(untracked_diff) => {
                    results.push(GitFileDiff {
                        path: normalize_git_path(&file_path),
                        diff: untracked_diff,
                    });
                }
                Err(_e) => {
                    // git diff --no-index returns 1 if there are differences, which run_git treats as error
                    // But it still outputs the diff.
                    // Wait, if it returns error, we might still have stdout.
                    // Let's refine run_git or handle it here.
                    let output = Command::new("git")
                        .args(["diff", "--no-index", "/dev/null", &file_path])
                        .current_dir(path)
                        .output()
                        .await
                        .map_err(|e| e.to_string())?;
                    
                    let diff = String::from_utf8_lossy(&output.stdout).to_string();
                    if !diff.is_empty() {
                        results.push(GitFileDiff {
                            path: normalize_git_path(&file_path),
                            diff,
                        });
                    }
                }
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub(crate) async fn get_git_log(
    workspace_id: String,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<GitLogResponse, String> {
    let workspaces = state.workspaces.lock().await;
    let entry = workspaces
        .get(&workspace_id)
        .ok_or("workspace not found")?
        .clone();

    let path = &entry.path;
    let max_items = limit.unwrap_or(40);

    // Get total count
    let total_str = run_git(path, &["rev-list", "--count", "HEAD"])
        .await
        .unwrap_or_else(|_| "0".to_string());
    let total = total_str.trim().parse::<usize>().unwrap_or(0);

    // Get log entries
    // Using \x1f (unit separator) as delimiter to avoid conflicts with commit messages
    let log_format = "%H\x1f%s\x1f%an\x1f%at";
    let log_output = run_git(path, &[
        "log",
        "-n",
        &max_items.to_string(),
        &format!("--pretty=format:{}", log_format),
    ])
    .await
    .map_err(|e| format!("Failed to get git log: {}", e))?;

    let mut entries = Vec::new();
    for line in log_output.lines() {
        let parts: Vec<&str> = line.split('\x1f').collect();
        if parts.len() == 4 {
            entries.push(GitLogEntry {
                sha: parts[0].to_string(),
                summary: parts[1].to_string(),
                author: parts[2].to_string(),
                timestamp: parts[3].parse::<i64>().unwrap_or(0),
            });
        }
    }

    let mut ahead = 0usize;
    let mut behind = 0usize;
    let mut ahead_entries = Vec::new();
    let mut behind_entries = Vec::new();
    let mut upstream = None;

    // Get upstream info
    if let Ok(u) = run_git(path, &["rev-parse", "--abbrev-ref", "HEAD@{u}"]).await {
        let u_trimmed = u.trim().to_string();
        if !u_trimmed.is_empty() {
            upstream = Some(u_trimmed.clone());

            // Get ahead/behind counts
            let counts = run_git(path, &["rev-list", "--left-right", "--count", &format!("HEAD...{}", u_trimmed)])
                .await
                .unwrap_or_default();
            let count_parts: Vec<&str> = counts.split_whitespace().collect();
            if count_parts.len() == 2 {
                ahead = count_parts[0].parse().unwrap_or(0);
                behind = count_parts[1].parse().unwrap_or(0);
            }

            // Get ahead entries
            if ahead > 0 {
                let ahead_output = run_git(path, &[
                    "log",
                    "-n",
                    &max_items.to_string(),
                    &format!("--pretty=format:{}", log_format),
                    &format!("{}..HEAD", u_trimmed),
                ]).await.unwrap_or_default();
                for line in ahead_output.lines() {
                    let parts: Vec<&str> = line.split('\x1f').collect();
                    if parts.len() == 4 {
                        ahead_entries.push(GitLogEntry {
                            sha: parts[0].to_string(),
                            summary: parts[1].to_string(),
                            author: parts[2].to_string(),
                            timestamp: parts[3].parse::<i64>().unwrap_or(0),
                        });
                    }
                }
            }

            // Get behind entries
            if behind > 0 {
                let behind_output = run_git(path, &[
                    "log",
                    "-n",
                    &max_items.to_string(),
                    &format!("--pretty=format:{}", log_format),
                    &format!("HEAD..{}", u_trimmed),
                ]).await.unwrap_or_default();
                for line in behind_output.lines() {
                    let parts: Vec<&str> = line.split('\x1f').collect();
                    if parts.len() == 4 {
                        behind_entries.push(GitLogEntry {
                            sha: parts[0].to_string(),
                            summary: parts[1].to_string(),
                            author: parts[2].to_string(),
                            timestamp: parts[3].parse::<i64>().unwrap_or(0),
                        });
                    }
                }
            }
        }
    }

    Ok(GitLogResponse {
        total,
        entries,
        ahead,
        behind,
        ahead_entries,
        behind_entries,
        upstream,
    })
}

#[tauri::command]
pub(crate) async fn get_git_remote(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let workspaces = state.workspaces.lock().await;
    let entry = workspaces
        .get(&workspace_id)
        .ok_or("workspace not found")?
        .clone();

    let path = &entry.path;
    
    let remote_output = run_git(path, &["remote"]).await.unwrap_or_default();
    let remotes: Vec<&str> = remote_output.lines().collect();
    
    let name = if remotes.contains(&"origin") {
        "origin"
    } else {
        remotes.first().copied().unwrap_or("")
    };

    if name.is_empty() {
        return Ok(None);
    }

    let url = run_git(path, &["remote", "get-url", name])
        .await
        .map(|u| u.trim().to_string())
        .ok();
    
    Ok(url)
}

#[tauri::command]
pub(crate) async fn get_github_issues(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<GitHubIssuesResponse, String> {
    let workspaces = state.workspaces.lock().await;
    let entry = workspaces
        .get(&workspace_id)
        .ok_or("workspace not found")?
        .clone();

    let path = &entry.path;

    let repo_name = {
        let remote_output = run_git(path, &["remote"]).await.unwrap_or_default();
        let remotes: Vec<&str> = remote_output.lines().collect();
        let name = if remotes.contains(&"origin") {
            "origin"
        } else {
            remotes.first().copied().unwrap_or("")
        };

        if name.is_empty() {
            return Err("No git remote configured.".to_string());
        }

        let remote_url = run_git(path, &["remote", "get-url", name])
            .await
            .map_err(|e| format!("Failed to get remote URL: {}", e))?
            .trim()
            .to_string();
            
        parse_github_repo(&remote_url).ok_or("Remote is not a GitHub repository.")?
    };

    let output = Command::new("gh")
        .args([
            "issue",
            "list",
            "--repo",
            &repo_name,
            "--limit",
            "50",
            "--json",
            "number,title,url,updatedAt",
        ])
        .current_dir(path)
        .output()
        .await
        .map_err(|e| format!("Failed to run gh: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let detail = if stderr.trim().is_empty() {
            stdout.trim()
        } else {
            stderr.trim()
        };
        if detail.is_empty() {
            return Err("GitHub CLI command failed.".to_string());
        }
        return Err(detail.to_string());
    }

    let issues: Vec<GitHubIssue> =
        serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;

    let search_query = format!("repo:{repo_name} is:issue is:open");
    let search_query = search_query.replace(' ', "+");
    let total = match Command::new("gh")
        .args([
            "api",
            &format!("/search/issues?q={search_query}"),
            "--jq",
            ".total_count",
        ])
        .current_dir(path)
        .output()
        .await
    {
        Ok(output) if output.status.success() => String::from_utf8_lossy(&output.stdout)
            .trim()
            .parse::<usize>()
            .unwrap_or(issues.len()),
        _ => issues.len(),
    };

    Ok(GitHubIssuesResponse { total, issues })
}

#[tauri::command]
pub(crate) async fn list_git_branches(
    workspace_id: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let workspaces = state.workspaces.lock().await;
    let entry = workspaces
        .get(&workspace_id)
        .ok_or("workspace not found")?
        .clone();

    let path = &entry.path;
    
    // %(refname:short) | %(authordate:unix)
    let output = run_git(path, &["branch", "--list", "--format=%(refname:short)|%(authordate:unix)"])
        .await
        .map_err(|e| format!("Failed to list branches: {}", e))?;

    let mut branches = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.trim().split('|').collect();
        if parts.len() == 2 {
            let name = parts[0].to_string();
            let last_commit = parts[1].parse::<i64>().unwrap_or(0);
            if !name.is_empty() {
                branches.push(BranchInfo { name, last_commit });
            }
        }
    }

    branches.sort_by(|a, b| b.last_commit.cmp(&a.last_commit));
    Ok(json!({ "branches": branches }))
}

#[tauri::command]
pub(crate) async fn checkout_git_branch(
    workspace_id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let workspaces = state.workspaces.lock().await;
    let entry = workspaces
        .get(&workspace_id)
        .ok_or("workspace not found")?
        .clone();

    run_git(&entry.path, &["checkout", &name])
        .await
        .map(|_| ())
        .map_err(|e| format!("Failed to checkout branch: {}", e))
}

#[tauri::command]
pub(crate) async fn create_git_branch(
    workspace_id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let workspaces = state.workspaces.lock().await;
    let entry = workspaces
        .get(&workspace_id)
        .ok_or("workspace not found")?
        .clone();

    run_git(&entry.path, &["checkout", "-b", &name])
        .await
        .map(|_| ())
        .map_err(|e| format!("Failed to create branch: {}", e))
}
