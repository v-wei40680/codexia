use crate::state::WatchState;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher, recommended_watcher};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Arc;

#[derive(Serialize, Debug, Clone)]
pub struct FsChangePayload {
    pub path: String,
    pub kind: String,
}

fn expand_path(input: &str) -> Result<PathBuf, String> {
    if input.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        Ok(home.join(&input[2..]))
    } else {
        Ok(Path::new(input).to_path_buf())
    }
}

fn kind_to_string(kind: &EventKind) -> String {
    use notify::event::*;
    match kind {
        EventKind::Create(CreateKind::Any) => "create".into(),
        EventKind::Create(_) => "create".into(),
        EventKind::Modify(ModifyKind::Any) => "modify".into(),
        EventKind::Modify(_) => "modify".into(),
        EventKind::Remove(RemoveKind::Any) => "remove".into(),
        EventKind::Remove(_) => "remove".into(),
        EventKind::Access(_) => "access".into(),
        EventKind::Other => "other".into(),
        EventKind::Any => "any".into(),
    }
}

async fn start_watch_path(
    state: &WatchState,
    path: String,
    emit: Arc<dyn Fn(FsChangePayload) + Send + Sync>,
) -> Result<(), String> {
    let abs = expand_path(&path)?;
    if !abs.exists() {
        return Err("Path does not exist".to_string());
    }
    let recursive_mode = if abs.is_dir() {
        RecursiveMode::Recursive
    } else {
        RecursiveMode::NonRecursive
    };

    let key = match std::fs::canonicalize(&abs) {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(_) => abs.to_string_lossy().to_string(),
    };

    // If already watching, ignore
    {
        let mut watchers = state.watchers.lock().await;
        if let Some((_existing, count)) = watchers.get_mut(&key) {
            *count += 1;
            return Ok(());
        }
    }

    let emit_for_cb = Arc::clone(&emit);
    // Create a new watcher with a callback that emits file change events.
    let mut watcher: RecommendedWatcher =
        recommended_watcher(move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                // Send one event per affected path.
                for p in event.paths.iter() {
                    let payload = FsChangePayload {
                        path: p.to_string_lossy().to_string(),
                        kind: kind_to_string(&event.kind),
                    };
                    emit_for_cb(payload);
                }
            }
        })
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(&abs, recursive_mode)
        .map_err(|e| format!("Failed to start watcher: {}", e))?;

    let mut watchers = state.watchers.lock().await;
    watchers.insert(key, (watcher, 1));
    Ok(())
}

async fn stop_watch_path(state: &WatchState, path: String) -> Result<(), String> {
    let abs = expand_path(&path)?;
    let key = match std::fs::canonicalize(&abs) {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(_) => abs.to_string_lossy().to_string(),
    };

    let mut watchers = state.watchers.lock().await;
    if let Some((_, count)) = watchers.get_mut(&key) {
        if *count > 1 {
            *count -= 1;
            return Ok(());
        }
    }
    if let Some((mut watcher, _)) = watchers.remove(&key) {
        let _ = watcher.unwatch(&abs);
    }
    Ok(())
}

pub async fn start_watch_directory(
    state: &WatchState,
    folder_path: String,
    emit: Arc<dyn Fn(FsChangePayload) + Send + Sync>,
) -> Result<(), String> {
    start_watch_path(state, folder_path, emit).await
}

pub async fn stop_watch_directory(state: &WatchState, folder_path: String) -> Result<(), String> {
    stop_watch_path(state, folder_path).await
}

pub async fn start_watch_file(
    state: &WatchState,
    file_path: String,
    emit: Arc<dyn Fn(FsChangePayload) + Send + Sync>,
) -> Result<(), String> {
    let abs = expand_path(&file_path)?;
    if !abs.exists() || !abs.is_file() {
        return Err("File does not exist".to_string());
    }
    start_watch_path(state, file_path, emit).await
}

pub async fn stop_watch_file(state: &WatchState, file_path: String) -> Result<(), String> {
    stop_watch_path(state, file_path).await
}
