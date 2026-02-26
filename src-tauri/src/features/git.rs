use anyhow::Result;
use gix::bstr::{BStr, BString, ByteSlice};
use serde::Serialize;
use std::collections::BTreeMap;
use std::ops::ControlFlow;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;

#[derive(Debug, Clone, Serialize)]
pub struct GitStatusEntry {
    pub path: String,
    pub index_status: char,
    pub worktree_status: char,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitStatusResponse {
    pub repo_root: String,
    pub entries: Vec<GitStatusEntry>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitFileDiffResponse {
    pub old_content: String,
    pub new_content: String,
    pub has_changes: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitFileDiffMetaResponse {
    pub old_bytes: usize,
    pub new_bytes: usize,
    pub total_bytes: usize,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct GitDiffStatsCounts {
    pub additions: usize,
    pub deletions: usize,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct GitDiffStatsResponse {
    pub staged: GitDiffStatsCounts,
    pub unstaged: GitDiffStatsCounts,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitPrepareThreadWorktreeResponse {
    pub repo_root: String,
    pub worktree_path: String,
    pub existed: bool,
}

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

fn open_repo(cwd: &str) -> Result<gix::Repository, String> {
    gix::discover(cwd).map_err(|err| format!("Failed to open git repository: {err}"))
}

fn normalize_repo_path(path: &str) -> String {
    path.replace('\\', "/").trim_start_matches("./").to_string()
}

fn to_repo_relative_path(repo: &gix::Repository, file_path: &str) -> Result<String, String> {
    let raw = Path::new(file_path);
    if raw.is_absolute() {
        let root = repo
            .workdir()
            .ok_or_else(|| "This git repository has no worktree".to_string())?;
        let relative = raw
            .strip_prefix(root)
            .map_err(|_| format!("Path is outside repository root: {}", raw.display()))?;
        return Ok(normalize_repo_path(&relative.to_string_lossy()));
    }
    Ok(normalize_repo_path(file_path))
}

fn remove_all_entries_for_path(index: &mut gix::index::File, path: &BStr) {
    index.remove_entries(|_, entry_path, _| entry_path == path);
}

fn repo_root(repo: &gix::Repository) -> String {
    repo.workdir()
        .unwrap_or_else(|| repo.git_dir())
        .display()
        .to_string()
}

fn entry_from_tree(
    repo: &gix::Repository,
    path: &str,
) -> Result<Option<(gix::hash::ObjectId, gix::object::tree::EntryMode)>, String> {
    let tree = match repo.head_tree() {
        Ok(tree) => tree,
        Err(_) => return Ok(None),
    };
    let entry = tree
        .lookup_entry_by_path(Path::new(path))
        .map_err(|err| format!("Failed to resolve HEAD tree entry: {err}"))?;
    Ok(entry.map(|value| (value.object_id(), value.mode())))
}

fn read_blob_as_text(repo: &gix::Repository, id: &gix::hash::oid) -> Result<String, String> {
    let object = repo
        .find_object(id.to_owned())
        .map_err(|err| format!("Failed to read object: {err}"))?;
    if object.kind != gix::object::Kind::Blob {
        return Ok(String::new());
    }
    Ok(String::from_utf8_lossy(&object.data).to_string())
}

fn blob_size(repo: &gix::Repository, id: &gix::hash::oid) -> Result<usize, String> {
    let object = repo
        .find_object(id.to_owned())
        .map_err(|err| format!("Failed to read object: {err}"))?;
    if object.kind != gix::object::Kind::Blob {
        return Ok(0);
    }
    Ok(object.data.len())
}

fn index_blob_content(
    repo: &gix::Repository,
    index: &gix::index::File,
    path: &str,
) -> Result<Option<String>, String> {
    let entry = match index.entry_by_path_and_stage(
        path.as_bytes().as_bstr(),
        gix::index::entry::Stage::Unconflicted,
    ) {
        Some(entry) => entry,
        None => return Ok(None),
    };
    read_blob_as_text(repo, &entry.id).map(Some)
}

fn index_blob_size(
    repo: &gix::Repository,
    index: &gix::index::File,
    path: &str,
) -> Result<Option<usize>, String> {
    let entry = match index.entry_by_path_and_stage(
        path.as_bytes().as_bstr(),
        gix::index::entry::Stage::Unconflicted,
    ) {
        Some(entry) => entry,
        None => return Ok(None),
    };
    blob_size(repo, &entry.id).map(Some)
}

fn head_blob_content(repo: &gix::Repository, path: &str) -> Result<Option<String>, String> {
    let (id, _) = match entry_from_tree(repo, path)? {
        Some(entry) => entry,
        None => return Ok(None),
    };
    read_blob_as_text(repo, &id).map(Some)
}

fn head_blob_size(repo: &gix::Repository, path: &str) -> Result<Option<usize>, String> {
    let (id, _) = match entry_from_tree(repo, path)? {
        Some(entry) => entry,
        None => return Ok(None),
    };
    blob_size(repo, &id).map(Some)
}

fn worktree_content(repo: &gix::Repository, path: &str) -> Result<Option<String>, String> {
    let root = match repo.workdir() {
        Some(path) => path,
        None => return Ok(None),
    };
    let absolute_path = root.join(path);
    let metadata = match std::fs::symlink_metadata(&absolute_path) {
        Ok(metadata) => metadata,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(err) => return Err(format!("Failed to read file metadata: {err}")),
    };

    if metadata.file_type().is_symlink() {
        let target = std::fs::read_link(&absolute_path)
            .map_err(|err| format!("Failed to read symlink: {err}"))?;
        return Ok(Some(target.to_string_lossy().to_string()));
    }
    if metadata.is_file() {
        let bytes = std::fs::read(&absolute_path)
            .map_err(|err| format!("Failed to read file content: {err}"))?;
        return Ok(Some(String::from_utf8_lossy(&bytes).to_string()));
    }
    Ok(Some(String::new()))
}

fn worktree_size(repo: &gix::Repository, path: &str) -> Result<Option<usize>, String> {
    let root = match repo.workdir() {
        Some(path) => path,
        None => return Ok(None),
    };
    let absolute_path = root.join(path);
    let metadata = match std::fs::symlink_metadata(&absolute_path) {
        Ok(metadata) => metadata,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(err) => return Err(format!("Failed to read file metadata: {err}")),
    };

    if metadata.file_type().is_symlink() {
        let target = std::fs::read_link(&absolute_path)
            .map_err(|err| format!("Failed to read symlink: {err}"))?;
        return Ok(Some(target.as_os_str().as_encoded_bytes().len()));
    }
    if metadata.is_file() {
        return Ok(Some(metadata.len() as usize));
    }
    Ok(Some(0))
}

fn stage_code_from_tree_index_change(change: &gix::diff::index::ChangeRef<'_, '_>) -> char {
    match change {
        gix::diff::index::ChangeRef::Addition { .. } => 'A',
        gix::diff::index::ChangeRef::Deletion { .. } => 'D',
        gix::diff::index::ChangeRef::Modification { .. } => 'M',
        gix::diff::index::ChangeRef::Rewrite { copy, .. } => {
            if *copy {
                'C'
            } else {
                'R'
            }
        }
    }
}

fn stage_entry_path(change: &gix::diff::index::ChangeRef<'_, '_>) -> (String, Option<String>) {
    match change {
        gix::diff::index::ChangeRef::Rewrite {
            source_location,
            location,
            copy,
            ..
        } => {
            let source = source_location.to_str_lossy().into_owned();
            let target = location.to_str_lossy().into_owned();
            if *copy {
                (target, None)
            } else {
                (target, Some(source))
            }
        }
        _ => (change.location().to_str_lossy().into_owned(), None),
    }
}

fn worktree_code_from_summary(summary: gix::status::index_worktree::iter::Summary) -> char {
    match summary {
        gix::status::index_worktree::iter::Summary::Added => '?',
        gix::status::index_worktree::iter::Summary::Removed => 'D',
        gix::status::index_worktree::iter::Summary::Modified => 'M',
        gix::status::index_worktree::iter::Summary::TypeChange => 'T',
        gix::status::index_worktree::iter::Summary::Renamed => 'R',
        gix::status::index_worktree::iter::Summary::Copied => 'C',
        gix::status::index_worktree::iter::Summary::Conflict => 'U',
        gix::status::index_worktree::iter::Summary::IntentToAdd => 'A',
    }
}

fn stat_for_worktree_path(repo: &gix::Repository, relative_path: &str) -> gix::index::entry::Stat {
    let Some(workdir) = repo.workdir() else {
        return gix::index::entry::Stat::default();
    };
    let absolute = workdir.join(relative_path);
    let metadata = match gix::index::fs::Metadata::from_path_no_follow(&absolute) {
        Ok(metadata) => metadata,
        Err(_) => return gix::index::entry::Stat::default(),
    };
    gix::index::entry::Stat::from_fs(&metadata).unwrap_or_default()
}

fn add_counts(total: &mut GitDiffStatsCounts, counts: GitDiffStatsCounts) {
    total.additions = total.additions.saturating_add(counts.additions);
    total.deletions = total.deletions.saturating_add(counts.deletions);
}

fn is_probably_binary(bytes: &[u8]) -> bool {
    bytes.iter().take(8 * 1024).any(|byte| *byte == 0)
}

fn count_line_changes(old: &[u8], new: &[u8]) -> GitDiffStatsCounts {
    if is_probably_binary(old) || is_probably_binary(new) {
        return GitDiffStatsCounts::default();
    }
    let input = gix::diff::blob::intern::InternedInput::new(
        gix::diff::blob::sources::byte_lines(old),
        gix::diff::blob::sources::byte_lines(new),
    );
    let counter = gix::diff::blob::diff(
        gix::diff::blob::Algorithm::Myers,
        &input,
        gix::diff::blob::sink::Counter::default(),
    );
    GitDiffStatsCounts {
        additions: counter.insertions as usize,
        deletions: counter.removals as usize,
    }
}

fn read_blob_bytes(repo: &gix::Repository, id: &gix::hash::oid) -> Result<Vec<u8>, String> {
    let object = repo
        .find_object(id.to_owned())
        .map_err(|err| format!("Failed to read object: {err}"))?;
    if object.kind != gix::object::Kind::Blob {
        return Ok(Vec::new());
    }
    Ok(object.data.clone())
}

fn index_blob_bytes(
    repo: &gix::Repository,
    index: &gix::index::File,
    path: &str,
) -> Result<Option<Vec<u8>>, String> {
    let entry = match index.entry_by_path_and_stage(
        path.as_bytes().as_bstr(),
        gix::index::entry::Stage::Unconflicted,
    ) {
        Some(entry) => entry,
        None => return Ok(None),
    };
    read_blob_bytes(repo, &entry.id).map(Some)
}

fn worktree_bytes(repo: &gix::Repository, path: &str) -> Result<Option<Vec<u8>>, String> {
    let root = match repo.workdir() {
        Some(path) => path,
        None => return Ok(None),
    };
    let absolute_path = root.join(path);
    let metadata = match std::fs::symlink_metadata(&absolute_path) {
        Ok(metadata) => metadata,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(err) => return Err(format!("Failed to read file metadata: {err}")),
    };

    if metadata.file_type().is_symlink() {
        let target = std::fs::read_link(&absolute_path)
            .map_err(|err| format!("Failed to read symlink: {err}"))?;
        return Ok(Some(target.as_os_str().as_encoded_bytes().to_vec()));
    }
    if metadata.is_file() {
        let bytes = std::fs::read(&absolute_path)
            .map_err(|err| format!("Failed to read file content: {err}"))?;
        return Ok(Some(bytes));
    }
    Ok(Some(Vec::new()))
}

fn staged_diff_stats(repo: &gix::Repository) -> Result<GitDiffStatsCounts, String> {
    let head_tree_id = repo
        .head_tree_id_or_empty()
        .map_err(|err| format!("Failed to resolve HEAD tree id: {err}"))?;
    let index = repo
        .index_or_empty()
        .map_err(|err| format!("Failed to load git index: {err}"))?;
    let mut pathspec = repo
        .pathspec(
            false,
            None::<&str>,
            false,
            &gix::index::State::new(repo.object_hash()),
            gix::worktree::stack::state::attributes::Source::IdMapping,
        )
        .map_err(|err| format!("Failed to prepare pathspec: {err}"))?;
    let mut rewrites = gix::diff::Rewrites::default();
    rewrites.limit = 0;

    let mut total = GitDiffStatsCounts::default();
    let mut callback_err: Option<String> = None;
    repo.tree_index_status(
        head_tree_id.as_ref(),
        &*index,
        Some(&mut pathspec),
        gix::status::tree_index::TrackRenames::Given(rewrites),
        |change, _, _| {
            let counts_result = match change {
                gix::diff::index::ChangeRef::Addition { id, .. } => {
                    read_blob_bytes(repo, id.as_ref()).map(|new| count_line_changes(&[], &new))
                }
                gix::diff::index::ChangeRef::Deletion { id, .. } => {
                    read_blob_bytes(repo, id.as_ref()).map(|old| count_line_changes(&old, &[]))
                }
                gix::diff::index::ChangeRef::Modification {
                    previous_id, id, ..
                } => {
                    let old = read_blob_bytes(repo, previous_id.as_ref());
                    let new = read_blob_bytes(repo, id.as_ref());
                    match (old, new) {
                        (Ok(old), Ok(new)) => Ok(count_line_changes(&old, &new)),
                        (Err(err), _) | (_, Err(err)) => Err(err),
                    }
                }
                gix::diff::index::ChangeRef::Rewrite { source_id, id, .. } => {
                    let old = read_blob_bytes(repo, source_id.as_ref());
                    let new = read_blob_bytes(repo, id.as_ref());
                    match (old, new) {
                        (Ok(old), Ok(new)) => Ok(count_line_changes(&old, &new)),
                        (Err(err), _) | (_, Err(err)) => Err(err),
                    }
                }
            };
            match counts_result {
                Ok(counts) => add_counts(&mut total, counts),
                Err(err) => {
                    callback_err.get_or_insert(err);
                }
            }
            Ok::<_, std::convert::Infallible>(ControlFlow::Continue(()))
        },
    )
    .map_err(|err| format!("Failed to collect staged status: {err}"))?;

    if let Some(err) = callback_err {
        return Err(err);
    }

    Ok(total)
}

fn unstaged_diff_stats(repo: &gix::Repository) -> Result<GitDiffStatsCounts, String> {
    let index = repo
        .index_or_empty()
        .map_err(|err| format!("Failed to load git index: {err}"))?;
    let iter = repo
        .status(gix::progress::Discard)
        .map_err(|err| format!("Failed to initialize worktree status: {err}"))?
        .untracked_files(gix::status::UntrackedFiles::Files)
        .index_worktree_options_mut(|opts| {
            if let Some(dirwalk_opts) = opts.dirwalk_options.as_mut() {
                dirwalk_opts.set_empty_patterns_match_prefix(false);
            }
        })
        .index_worktree_rewrites(None)
        .into_index_worktree_iter(Vec::<BString>::new())
        .map_err(|err| format!("Failed to collect worktree status: {err}"))?;

    let mut total = GitDiffStatsCounts::default();
    for item in iter {
        let item = item.map_err(|err| format!("Failed to read worktree status item: {err}"))?;
        let Some(summary) = item.summary() else {
            continue;
        };
        if summary == gix::status::index_worktree::iter::Summary::Added {
            continue;
        }

        let path = item.rela_path().to_str_lossy().into_owned();
        let old = index_blob_bytes(repo, &index, &path)?.unwrap_or_default();
        let new = worktree_bytes(repo, &path)?.unwrap_or_default();
        add_counts(&mut total, count_line_changes(&old, &new));
    }

    Ok(total)
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

fn repo_root_path(repo: &gix::Repository) -> Result<PathBuf, String> {
    repo.workdir()
        .map(|path| path.to_path_buf())
        .ok_or_else(|| "This git repository has no worktree".to_string())
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

pub fn git_status(cwd: String) -> Result<GitStatusResponse, String> {
    let repo = open_repo(&cwd)?;
    let mut table: BTreeMap<String, (char, char)> = BTreeMap::new();

    let head_tree_id = repo
        .head_tree_id_or_empty()
        .map_err(|err| format!("Failed to resolve HEAD tree id: {err}"))?;
    let index = repo
        .index_or_empty()
        .map_err(|err| format!("Failed to load git index: {err}"))?;
    let mut full_repo_pathspec = repo
        .pathspec(
            false,
            None::<&str>,
            false,
            &gix::index::State::new(repo.object_hash()),
            gix::worktree::stack::state::attributes::Source::IdMapping,
        )
        .map_err(|err| format!("Failed to prepare full-repo pathspec: {err}"))?;
    let mut rename_tracking = gix::diff::Rewrites::default();
    rename_tracking.limit = 0;

    repo.tree_index_status(
        head_tree_id.as_ref(),
        &*index,
        Some(&mut full_repo_pathspec),
        gix::status::tree_index::TrackRenames::Given(rename_tracking),
        |change, _, _| {
            let (path, remove_source_path) = stage_entry_path(&change);
            if let Some(source_path) = remove_source_path {
                table.remove(&source_path);
            }
            let entry = table.entry(path).or_insert((' ', ' '));
            entry.0 = stage_code_from_tree_index_change(&change);
            Ok::<_, std::convert::Infallible>(ControlFlow::Continue(()))
        },
    )
    .map_err(|err| format!("Failed to collect staged status: {err}"))?;

    let iter = repo
        .status(gix::progress::Discard)
        .map_err(|err| format!("Failed to initialize worktree status: {err}"))?
        .untracked_files(gix::status::UntrackedFiles::Files)
        .index_worktree_options_mut(|opts| {
            if let Some(dirwalk_opts) = opts.dirwalk_options.as_mut() {
                dirwalk_opts.set_empty_patterns_match_prefix(false);
            }
        })
        .index_worktree_rewrites(None)
        .into_index_worktree_iter(Vec::<BString>::new())
        .map_err(|err| format!("Failed to collect worktree status: {err}"))?;

    for item in iter {
        let item = item.map_err(|err| format!("Failed to read worktree status item: {err}"))?;
        let Some(summary) = item.summary() else {
            continue;
        };
        let path = item.rela_path().to_str_lossy().into_owned();
        let code = worktree_code_from_summary(summary);
        let entry = table.entry(path).or_insert((' ', ' '));
        if code == '?' {
            entry.0 = '?';
            entry.1 = '?';
        } else {
            entry.1 = code;
        }
    }

    let entries = table
        .into_iter()
        .map(|(path, (index_status, worktree_status))| GitStatusEntry {
            path,
            index_status,
            worktree_status,
        })
        .collect();

    Ok(GitStatusResponse {
        repo_root: repo_root(&repo),
        entries,
    })
}

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

pub fn git_stage_files(cwd: String, file_paths: Vec<String>) -> Result<(), String> {
    let repo = open_repo(&cwd)?;
    let (mut pipeline, index_handle) = repo
        .filter_pipeline(None)
        .map_err(|err| format!("Failed to initialize git filter pipeline: {err}"))?;
    let mut index = index_handle.into_owned();

    for path in &file_paths {
        let relative_path = to_repo_relative_path(&repo, path)?;
        let path_bstring = BString::from(relative_path.as_str());
        let path_bstr = path_bstring.as_ref();

        remove_all_entries_for_path(&mut index, path_bstr);

        let staged = pipeline
            .worktree_file_to_object(path_bstr, &index)
            .map_err(|err| format!("Failed to stage {relative_path}: {err}"))?;

        if let Some((object_id, entry_kind, _)) = staged {
            let mode = gix::index::entry::Mode::from(entry_kind);
            let flags =
                gix::index::entry::Flags::from_stage(gix::index::entry::Stage::Unconflicted);
            let stat = stat_for_worktree_path(&repo, &relative_path);
            index.dangerously_push_entry(stat, object_id, flags, mode, path_bstr);
        }
    }

    index.sort_entries();
    let _ = index.remove_tree();
    let _ = index.remove_resolve_undo();
    index
        .write(Default::default())
        .map_err(|err| format!("Failed to write git index: {err}"))?;
    Ok(())
}

pub fn git_unstage_files(cwd: String, file_paths: Vec<String>) -> Result<(), String> {
    let repo = open_repo(&cwd)?;
    let mut index = {
        let shared = repo
            .index_or_empty()
            .map_err(|err| format!("Failed to load git index: {err}"))?;
        gix::index::File::clone(&shared)
    };
    for path in &file_paths {
        let relative_path = to_repo_relative_path(&repo, path)?;
        let path_bstring = BString::from(relative_path.as_str());
        let path_bstr = path_bstring.as_ref();

        remove_all_entries_for_path(&mut index, path_bstr);

        let Some((object_id, entry_mode)) = entry_from_tree(&repo, &relative_path)? else {
            continue;
        };

        let mode = gix::index::entry::Mode::from(entry_mode);
        let flags = gix::index::entry::Flags::from_stage(gix::index::entry::Stage::Unconflicted);
        index.dangerously_push_entry(
            gix::index::entry::Stat::default(),
            object_id,
            flags,
            mode,
            path_bstr,
        );
    }

    index.sort_entries();
    let _ = index.remove_tree();
    let _ = index.remove_resolve_undo();
    index
        .write(Default::default())
        .map_err(|err| format!("Failed to write git index: {err}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

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

        let stats =
            git_diff_stats(repo_dir.to_string_lossy().to_string()).expect("compute diff stats");

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
}
