use gix::bstr::BString;

use crate::features::git::helpers::{
    entry_from_tree, open_repo, remove_all_entries_for_path, stat_for_worktree_path, to_repo_relative_path,
};

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
