use super::*;
use std::path::{Path, PathBuf};

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

#[test]
fn git_status_reports_whole_repo_from_subdirectory_cwd() {
    let temp = tempfile::tempdir().expect("create tempdir");
    let repo_dir = temp.path();
    let subdir = repo_dir.join("subdir");
    std::fs::create_dir_all(&subdir).expect("create subdir");
    std::fs::write(repo_dir.join("root.txt"), "root").expect("write root file");
    std::fs::write(subdir.join("nested.txt"), "nested").expect("write nested file");

    gix::init(repo_dir).expect("init repo");
    let status = git_status(subdir.to_string_lossy().to_string()).expect("status ok");

    let paths: std::collections::BTreeSet<_> =
        status.entries.into_iter().map(|entry| entry.path).collect();
    assert!(
        paths.contains("root.txt"),
        "root file should be visible when cwd is subdir"
    );
    assert!(
        paths.contains("subdir/nested.txt"),
        "nested file should be visible when cwd is subdir"
    );
}

fn init_repo_with_one_commit(repo_dir: &Path) {
    use gix::bstr::ByteSlice;

    let repo = gix::init(repo_dir).expect("init repo");
    let empty_tree = repo.empty_tree().id().detach();
    let signature = gix::actor::SignatureRef {
        name: b"Codex Test".as_bstr(),
        email: b"codex@test.local".as_bstr(),
        time: "0 +0000",
    };
    repo.commit_as(signature, signature, "HEAD", "seed", empty_tree, Vec::<gix::ObjectId>::new())
        .expect("create initial commit");
}

#[test]
fn git_diff_stats_reports_staged_and_unstaged_counts() {
    let temp = tempfile::tempdir().expect("create tempdir");
    let repo_dir = temp.path();
    gix::init(repo_dir).expect("init repo");

    let file_path = repo_dir.join("demo.txt");
    std::fs::write(&file_path, "one\ntwo\n").expect("write initial file");

    git_stage_files(
        repo_dir.to_string_lossy().to_string(),
        vec!["demo.txt".to_string()],
    )
    .expect("stage initial file");

    std::fs::write(&file_path, "zero\none\nthree\n").expect("write unstaged update");

    let stats = git_diff_stats(repo_dir.to_string_lossy().to_string()).expect("compute diff stats");

    assert_eq!(stats.staged.additions, 2);
    assert_eq!(stats.staged.deletions, 0);
    assert_eq!(stats.unstaged.additions, 2);
    assert_eq!(stats.unstaged.deletions, 1);
}

#[test]
fn git_prepare_thread_worktree_creates_and_reuses_worktree_path() {
    let temp = tempfile::tempdir().expect("create tempdir");
    let repo_dir = temp.path();
    init_repo_with_one_commit(repo_dir);

    let first = git_prepare_thread_worktree(
        repo_dir.to_string_lossy().to_string(),
        "thread-42".to_string(),
    )
    .expect("create worktree");
    assert!(!first.existed, "first call should create worktree");

    let worktree = PathBuf::from(&first.worktree_path);
    assert!(worktree.exists(), "worktree path should exist");
    assert!(
        gix::discover(&worktree).is_ok(),
        "worktree path should be a git repository"
    );

    let second = git_prepare_thread_worktree(
        repo_dir.to_string_lossy().to_string(),
        "thread-42".to_string(),
    )
    .expect("reuse existing worktree");
    assert!(second.existed, "second call should detect existing worktree");
    assert_eq!(first.worktree_path, second.worktree_path);

    let source_repo = gix::discover(repo_dir).expect("open source repo");
    let source_head = source_repo.head_id().expect("source head").detach();
    let worktree_repo = gix::discover(&worktree).expect("open worktree repo");
    let worktree_head = worktree_repo.head_id().expect("worktree head").detach();
    assert_eq!(source_head, worktree_head, "worktree should point to same HEAD");
}
