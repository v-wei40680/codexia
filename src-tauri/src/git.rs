use anyhow::Result;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;

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

    // Perform the clone operation
    let (mut checkout, _outcome) = prepare
        .fetch_then_checkout(gix::progress::Discard, &should_interrupt)
        .map_err(|e| anyhow::anyhow!("fetch_then_checkout failed: {}", e))?;

    // Get the repository and ensure all operations complete
    let repo = checkout.main_worktree(gix::progress::Discard, &should_interrupt)?;
    drop(repo);

    // Verify that the .git directory was created
    let git_dir = path.join(".git");
    if !git_dir.exists() {
        anyhow::bail!(
            "clone appeared to succeed but .git directory not found at: {}",
            git_dir.display()
        );
    }

    Ok(path.to_path_buf())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn plugins_dir() -> PathBuf {
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("~"))
            .join(".agents")
            .join("plugins")
    }

    #[test]
    #[ignore = "requires network access and writes into ~/.agents/plugins"]
    fn clone_skills_repo_to_agents_plugins() {
        let target = plugins_dir();
        let result = clone("https://github.com/anthropics/skills.git", &target);
        assert!(result.is_ok(), "clone failed: {result:?}");
    }
}
