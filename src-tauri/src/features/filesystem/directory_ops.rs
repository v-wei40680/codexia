use super::file_types::FileEntry;
use ignore::WalkBuilder;
use nucleo::pattern::{AtomKind, CaseMatching, Normalization, Pattern};
use nucleo::{Config, Matcher, Utf32String};
use std::fs;
use std::path::{Path, PathBuf};

fn normalize_name(name: &str) -> String {
    name.to_lowercase()
}

fn is_dot_git(name: &str) -> bool {
    name.eq_ignore_ascii_case(".git")
}

pub async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let expanded_path = if path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&path[2..])
    } else {
        Path::new(&path).to_path_buf()
    };

    if !expanded_path.exists() || !expanded_path.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let mut entries = Vec::new();

    match fs::read_dir(&expanded_path) {
        Ok(dir_entries) => {
            for entry in dir_entries {
                match entry {
                    Ok(entry) => {
                        let path = entry.path();
                        let name = path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string();

                        let is_directory = path.is_dir();
                        let size = if is_directory {
                            None
                        } else {
                            fs::metadata(&path).ok().map(|m| m.len())
                        };

                        let extension = if is_directory {
                            None
                        } else {
                            path.extension()
                                .and_then(|ext| ext.to_str())
                                .map(|s| s.to_string())
                        };

                        entries.push(FileEntry {
                            name,
                            path: path.to_string_lossy().to_string(),
                            is_directory,
                            size,
                            extension,
                        });
                    }
                    Err(_) => continue,
                }
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }

    // Sort directories first, then files
    entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

pub async fn get_home_directory() -> Result<String, String> {
    let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
    Ok(home.to_string_lossy().to_string())
}

pub async fn search_files(
    root: String,
    query: String,
    exclude_folders: Vec<String>,
    // Optional cap to avoid returning an extremely large result set
    max_results: Option<usize>,
) -> Result<Vec<FileEntry>, String> {
    let expanded_root: PathBuf = if root.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&root[2..])
    } else {
        Path::new(&root).to_path_buf()
    };

    if !expanded_root.exists() || !expanded_root.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let limit = max_results.unwrap_or(2000);
    let excluded_names = exclude_folders
        .into_iter()
        .map(|name| name.to_lowercase())
        .collect::<std::collections::HashSet<_>>();

    let excluded_names_for_walk = excluded_names.clone();
    let walker = WalkBuilder::new(&expanded_root)
        .follow_links(false)
        .hidden(false)
        .git_ignore(true)
        .git_exclude(true)
        .git_global(true)
        .parents(true)
        .filter_entry(move |entry| {
            if entry.path_is_symlink() {
                return false;
            }
            if let Some(name) = entry.file_name().to_str() {
                if is_dot_git(name) {
                    return false;
                }
                return !excluded_names_for_walk.contains(&normalize_name(name));
            }
            true
        })
        .build();

    let root_str = expanded_root.to_string_lossy();
    let root_prefix = format!("{}/", root_str);

    let mut all_entries: Vec<FileEntry> = Vec::new();
    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        if path == expanded_root {
            continue;
        }
        let file_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n,
            None => continue,
        };
        if excluded_names.contains(&normalize_name(file_name)) || is_dot_git(file_name) {
            continue;
        }
        let is_directory = entry.file_type().is_some_and(|ft| ft.is_dir());
        let path_str = path.to_string_lossy().to_string();
        let size = if is_directory {
            None
        } else {
            fs::metadata(path).ok().map(|m| m.len())
        };
        let extension = if is_directory {
            None
        } else {
            path.extension()
                .and_then(|ext| ext.to_str())
                .map(|s| s.to_string())
        };
        all_entries.push(FileEntry {
            name: file_name.to_string(),
            path: path_str,
            is_directory,
            size,
            extension,
        });
    }

    if query.is_empty() {
        all_entries.sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));
        all_entries.truncate(limit);
        return Ok(all_entries);
    }

    let pattern = Pattern::new(
        &query,
        CaseMatching::Smart,
        Normalization::Smart,
        AtomKind::Fuzzy,
    );
    let mut matcher = Matcher::new(Config::DEFAULT.match_paths());

    let mut scored: Vec<(u32, FileEntry)> = all_entries
        .into_iter()
        .filter_map(|entry| {
            let haystack = if entry.path.starts_with(root_prefix.as_str()) {
                &entry.path[root_prefix.len()..]
            } else {
                &entry.path
            };
            let utf32 = Utf32String::from(haystack);
            pattern
                .score(utf32.slice(..), &mut matcher)
                .map(|score| (score, entry))
        })
        .collect();

    scored.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.path.cmp(&b.1.path)));
    scored.truncate(limit);

    Ok(scored.into_iter().map(|(_, e)| e).collect())
}

pub async fn canonicalize_path(path: String) -> Result<String, String> {
    let expanded = if path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&path[2..])
    } else {
        Path::new(&path).to_path_buf()
    };
    match std::fs::canonicalize(&expanded) {
        Ok(p) => Ok(p.to_string_lossy().to_string()),
        Err(_) => Ok(expanded.to_string_lossy().to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::search_files;
    use std::fs;

    #[tokio::test]
    async fn search_files_respects_gitignore_but_keeps_non_ignored_git_folder() {
        let temp = tempfile::tempdir().expect("create tempdir");
        let root = temp.path();

        fs::create_dir_all(root.join("src/components/features/git")).expect("create git feature dir");
        fs::create_dir_all(root.join("ignored_area")).expect("create ignored dir");
        fs::create_dir_all(root.join(".git")).expect("create .git dir");
        fs::write(root.join("src/components/features/git/readme.md"), "ok").expect("write feature file");
        fs::write(root.join("ignored_area/git-note.txt"), "ignore me").expect("write ignored file");
        fs::write(root.join(".gitignore"), "ignored_area/\n").expect("write gitignore");

        let results = search_files(
            root.to_string_lossy().to_string(),
            "git".to_string(),
            vec![],
            Some(100),
        )
        .await
        .expect("search should succeed");

        assert!(
            results.iter().any(|entry| {
                entry.is_directory
                    && entry
                        .path
                        .ends_with("src/components/features/git")
            }),
            "expected src/components/features/git to be present in search results"
        );
        assert!(
            results
                .iter()
                .all(|entry| !entry.path.contains("ignored_area")),
            "expected paths ignored by .gitignore to be excluded"
        );
    }

    #[tokio::test]
    async fn search_files_applies_frontend_exclude_folders_in_addition_to_gitignore() {
        let temp = tempfile::tempdir().expect("create tempdir");
        let root = temp.path();

        fs::create_dir_all(root.join("src/components/features/git")).expect("create kept dir");
        fs::create_dir_all(root.join("tmp_cache/git_stash")).expect("create excluded dir");
        fs::create_dir_all(root.join(".git")).expect("create .git dir");
        fs::write(root.join("src/components/features/git/readme.md"), "ok").expect("write kept file");
        fs::write(root.join("tmp_cache/git_stash/note.txt"), "skip").expect("write excluded file");
        fs::write(root.join(".gitignore"), "").expect("write gitignore");

        let results = search_files(
            root.to_string_lossy().to_string(),
            "git".to_string(),
            vec!["tmp_cache".to_string()],
            Some(100),
        )
        .await
        .expect("search should succeed");

        assert!(
            results.iter().any(|entry| {
                entry
                    .path
                    .ends_with("src/components/features/git")
            }),
            "expected non-excluded git folder to be present"
        );
        assert!(
            results.iter().all(|entry| !entry.path.contains("/tmp_cache/")),
            "expected frontend excluded folders to be filtered out"
        );
    }

    #[tokio::test]
    async fn search_files_excluding_dot_git_does_not_exclude_git_named_folder() {
        let temp = tempfile::tempdir().expect("create tempdir");
        let root = temp.path();

        fs::create_dir_all(root.join(".git")).expect("create .git dir");
        fs::create_dir_all(root.join("src/components/features/git")).expect("create git feature dir");
        fs::write(root.join("src/components/features/git/readme.md"), "ok").expect("write feature file");
        fs::write(root.join(".gitignore"), "").expect("write gitignore");

        let results = search_files(
            root.to_string_lossy().to_string(),
            "git".to_string(),
            vec![".git".to_string()],
            Some(100),
        )
        .await
        .expect("search should succeed");

        assert!(
            results.iter().any(|entry| {
                entry.is_directory
                    && entry
                        .path
                        .ends_with("src/components/features/git")
            }),
            "expected src/components/features/git to be present when excluding only .git"
        );
        assert!(
            results.iter().all(|entry| !entry.path.ends_with("/.git")),
            "expected .git directory to stay excluded"
        );
    }
}
