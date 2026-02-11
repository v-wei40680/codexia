use gix::bstr::{BStr, BString, ByteSlice};
use serde::Serialize;
use std::collections::BTreeMap;
use std::ops::ControlFlow;
use std::path::Path;

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

#[tauri::command]
pub async fn git_status(cwd: String) -> Result<GitStatusResponse, String> {
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
        // Force full untracked file expansion instead of honoring collapsed config.
        .untracked_files(gix::status::UntrackedFiles::Files)
        // Always evaluate against repository root rather than the process CWD prefix.
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

#[tauri::command]
pub async fn git_file_diff(
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

#[tauri::command]
pub async fn git_file_diff_meta(
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

#[tauri::command]
pub async fn git_stage_files(cwd: String, file_paths: Vec<String>) -> Result<(), String> {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn git_status_reports_whole_repo_from_subdirectory_cwd() {
        let temp = tempfile::tempdir().expect("create tempdir");
        let repo_dir = temp.path();
        let subdir = repo_dir.join("subdir");
        std::fs::create_dir_all(&subdir).expect("create subdir");
        std::fs::write(repo_dir.join("root.txt"), "root").expect("write root file");
        std::fs::write(subdir.join("nested.txt"), "nested").expect("write nested file");

        gix::init(repo_dir).expect("init repo");
        let status = git_status(subdir.to_string_lossy().to_string())
            .await
            .expect("status ok");

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
}

#[tauri::command]
pub async fn git_unstage_files(cwd: String, file_paths: Vec<String>) -> Result<(), String> {
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
