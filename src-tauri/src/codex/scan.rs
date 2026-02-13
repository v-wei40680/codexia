use std::fs::{self, File};
use std::io::{self, BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, Once, OnceLock};
use std::time::{Duration, Instant};

use super::event_sink::EventSink;
use super::utils::{
    codex_home, codexia_history_path, extract_preview, file_mtime, legacy_plux_history_path,
    parse_json_line, parse_ts,
};
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{HashMap, HashSet};
use walkdir::WalkDir;

type EventSinks = Arc<Mutex<Vec<Arc<dyn EventSink>>>>;

static HISTORY_SCANNER_START: Once = Once::new();
static HISTORY_SCANNER_SINKS: OnceLock<EventSinks> = OnceLock::new();
static HISTORY_CACHE: OnceLock<Mutex<Option<Vec<HistoryEntry>>>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub preview: String,
    pub cwd: String,
    #[serde(default)]
    pub path: String,
    pub source: String,
    pub ts: i64,
    #[serde(default)]
    pub updated_at: i64,
    #[serde(default)]
    pub archived: bool,
}

pub fn start_history_scanner(event_sink: Arc<dyn EventSink>) {
    let sinks = HISTORY_SCANNER_SINKS
        .get_or_init(|| Arc::new(Mutex::new(Vec::new())))
        .clone();
    if let Ok(mut guarded) = sinks.lock() {
        guarded.push(Arc::clone(&event_sink));
    }

    let mut started_now = false;
    HISTORY_SCANNER_START.call_once(|| {
        started_now = true;

        let sessions_root = codex_home().join("sessions");
        let cached_entries = load_cached_history_entries().unwrap_or_default();
        emit_entries_to_sinks(&sinks, &cached_entries);

        std::thread::spawn(move || {
            let mut known_preview_paths: HashSet<String> = cached_entries
                .iter()
                .filter(|entry| !entry.preview.trim().is_empty())
                .map(|entry| history_path_key(Path::new(&entry.path)))
                .collect();

            let _ = scan_and_emit_to_sinks(&sinks, &mut known_preview_paths);

            if !sessions_root.exists() {
                return;
            }

            let (tx, rx) = std::sync::mpsc::channel();
            let mut watcher: RecommendedWatcher = match notify::recommended_watcher(tx) {
                Ok(watcher) => watcher,
                Err(err) => {
                    eprintln!("history scanner: watcher init failed: {err}");
                    return;
                }
            };

            if let Err(err) = watcher.watch(&sessions_root, RecursiveMode::Recursive) {
                eprintln!("history scanner: watch failed: {err}");
                return;
            }
            let mut last_scan = Instant::now() - Duration::from_secs(60);
            loop {
                match rx.recv() {
                    Ok(Ok(event)) => {
                        if last_scan.elapsed() < Duration::from_millis(500) {
                            continue;
                        }
                        if !should_rescan_for_event(&event, &known_preview_paths) {
                            continue;
                        }
                        last_scan = Instant::now();
                        let _ = scan_and_emit_to_sinks(&sinks, &mut known_preview_paths);
                    }
                    Ok(Err(err)) => {
                        eprintln!("history scanner: watch event error: {err}");
                    }
                    Err(_) => break,
                }
            }
        });
    });

    if !started_now {
        let entries = load_cached_history_entries().unwrap_or_default();
        emit_entries_to_sink(&*event_sink, &entries);
    }
}

pub fn history_entries_to_thread_values(entries: &[HistoryEntry]) -> Vec<Value> {
    entries
        .iter()
        .map(|entry| {
            json!({
                "id": entry.id,
                "preview": entry.preview,
                "cwd": entry.cwd,
                "path": entry.path,
                "source": entry.source,
                "ts": entry.ts,
                "updatedAt": entry.updated_at,
                "archived": entry.archived,
            })
        })
        .collect()
}

pub fn scan_history_entries() -> io::Result<Vec<HistoryEntry>> {
    let mut entries = load_cached_history_entries()?;
    entries = reconcile_sessions_with_cache(entries)?;
    entries.sort_by(|a, b| b.ts.cmp(&a.ts));
    write_history(&entries)?;
    store_cached_history_entries(entries.clone());
    Ok(entries)
}

pub fn scan_archived_entries() -> io::Result<Vec<HistoryEntry>> {
    let mut entries = scan_archived_sessions()?;
    entries.sort_by(|a, b| b.ts.cmp(&a.ts));
    Ok(entries)
}

pub fn list_threads_payload(params: Value, cwd: Option<&str>) -> io::Result<Value> {
    let archived = params
        .get("archived")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let sort_key = params
        .get("sortKey")
        .and_then(Value::as_str)
        .unwrap_or("created_at");
    let limit = params
        .get("limit")
        .and_then(Value::as_u64)
        .map(|n| n as usize)
        .unwrap_or(20);
    let offset = params
        .get("cursor")
        .and_then(Value::as_str)
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(0);
    let source_kinds: Option<Vec<String>> = params
        .get("sourceKinds")
        .and_then(Value::as_array)
        .map(|values| {
            values
                .iter()
                .filter_map(|v| v.as_str().map(ToOwned::to_owned))
                .collect::<Vec<_>>()
        })
        .filter(|kinds| !kinds.is_empty());

    let mut entries = if archived {
        scan_archived_entries()?
    } else {
        load_cached_history_entries()?
    };

    if let Some(cwd) = cwd {
        let filter_cwd = cwd.trim();
        if !filter_cwd.is_empty() {
            let filter_repo_root = repo_root_for_path(filter_cwd);
            let mut entry_repo_roots: HashMap<String, Option<String>> = HashMap::new();
            entries.retain(|entry| {
                if entry.cwd == filter_cwd {
                    return true;
                }
                let entry_root = entry_repo_roots
                    .entry(entry.cwd.clone())
                    .or_insert_with(|| repo_root_for_path(&entry.cwd));
                match (&filter_repo_root, entry_root) {
                    (Some(filter_root), Some(entry_root)) => filter_root == entry_root,
                    _ => false,
                }
            });
        }
    }

    if let Some(source_kinds) = source_kinds {
        entries.retain(|entry| source_kinds.iter().any(|kind| kind == &entry.source));
    }

    entries.retain(|entry| !entry.preview.trim().is_empty());
    if sort_key == "updated_at" {
        entries.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    } else {
        entries.sort_by(|a, b| b.ts.cmp(&a.ts));
    }

    let total = entries.len();
    let start = offset.min(total);
    let end = start.saturating_add(limit).min(total);
    let next_cursor = if end < total {
        Some(end.to_string())
    } else {
        None
    };

    let page = &entries[start..end];
    Ok(json!({
        "data": history_entries_to_thread_values(page),
        "nextCursor": next_cursor,
    }))
}

pub fn list_archived_threads_payload(params: Value) -> io::Result<Value> {
    let sort_key = params
        .get("sortKey")
        .and_then(Value::as_str)
        .unwrap_or("created_at");
    let limit = params
        .get("limit")
        .and_then(Value::as_u64)
        .map(|n| n as usize)
        .unwrap_or(20);
    let offset = params
        .get("cursor")
        .and_then(Value::as_str)
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(0);
    let source_kinds: Option<Vec<String>> = params
        .get("sourceKinds")
        .and_then(Value::as_array)
        .map(|values| {
            values
                .iter()
                .filter_map(|v| v.as_str().map(ToOwned::to_owned))
                .collect::<Vec<_>>()
        })
        .filter(|kinds| !kinds.is_empty());

    // Archived threads are always scanned from codex_home()/archived_sessions.
    let mut entries = scan_archived_entries()?;

    if let Some(source_kinds) = source_kinds {
        entries.retain(|entry| source_kinds.iter().any(|kind| kind == &entry.source));
    }

    entries.retain(|entry| !entry.preview.trim().is_empty());
    if sort_key == "updated_at" {
        entries.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    } else {
        entries.sort_by(|a, b| b.ts.cmp(&a.ts));
    }

    let total = entries.len();
    let start = offset.min(total);
    let end = start.saturating_add(limit).min(total);
    let next_cursor = if end < total {
        Some(end.to_string())
    } else {
        None
    };

    let page = &entries[start..end];
    Ok(json!({
        "data": history_entries_to_thread_values(page),
        "nextCursor": next_cursor,
    }))
}

fn scan_and_emit_to_sinks(
    sinks: &EventSinks,
    known_preview_paths: &mut HashSet<String>,
) -> io::Result<()> {
    let entries = scan_history_entries()?;
    let non_empty_entries = filtered_non_empty_entries(&entries);
    *known_preview_paths = non_empty_entries
        .iter()
        .map(|entry| history_path_key(Path::new(&entry.path)))
        .collect();
    emit_entries_to_sinks(sinks, &entries);
    Ok(())
}

fn filtered_non_empty_entries(entries: &[HistoryEntry]) -> Vec<HistoryEntry> {
    entries
        .iter()
        .filter(|entry| !entry.preview.trim().is_empty())
        .cloned()
        .collect::<Vec<_>>()
}

fn emit_entries_to_sink(event_sink: &dyn EventSink, entries: &[HistoryEntry]) {
    let non_empty_entries = filtered_non_empty_entries(entries);
    let payload = json!({
        "data": history_entries_to_thread_values(&non_empty_entries),
        "nextCursor": null
    });
    event_sink.emit("thread/list-updated", payload);
}

fn emit_entries_to_sinks(sinks: &EventSinks, entries: &[HistoryEntry]) {
    let sink_list = match sinks.lock() {
        Ok(guarded) => guarded.clone(),
        Err(_) => Vec::new(),
    };
    for sink in sink_list {
        emit_entries_to_sink(&*sink, entries);
    }
}

fn should_rescan_for_event(event: &Event, known_preview_paths: &HashSet<String>) -> bool {
    let is_delete_like = matches!(event.kind, EventKind::Remove(_));
    for path in &event.paths {
        if path.extension().and_then(|ext| ext.to_str()) != Some("jsonl") {
            continue;
        }
        let key = history_path_key(path);
        if !known_preview_paths.contains(&key) {
            return true;
        }
        if is_delete_like {
            return true;
        }
    }
    false
}

fn history_path_key(path: &Path) -> String {
    let normalized: PathBuf = std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    normalized.to_string_lossy().to_string()
}

fn repo_root_for_path(path: &str) -> Option<String> {
    let repo = gix::discover(path).ok()?;
    let root = repo.workdir()?;
    Some(root.to_string_lossy().to_string())
}

fn reconcile_sessions_with_cache(cached_entries: Vec<HistoryEntry>) -> io::Result<Vec<HistoryEntry>> {
    let sessions_root = codex_home().join("sessions");
    if !sessions_root.exists() {
        return Ok(Vec::new());
    }

    let cached_by_path: HashMap<String, HistoryEntry> = cached_entries
        .into_iter()
        .filter(|entry| !entry.archived)
        .map(|entry| (history_path_key(Path::new(&entry.path)), entry))
        .collect();

    let mut paths_in_fs: HashSet<String> = HashSet::new();
    let mut next_entries: Vec<HistoryEntry> = Vec::new();

    for entry in WalkDir::new(&sessions_root).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        if entry.path().extension().and_then(|s| s.to_str()) != Some("jsonl") {
            continue;
        }

        let key = history_path_key(entry.path());
        paths_in_fs.insert(key.clone());
        let mtime = file_mtime(entry.path()).unwrap_or_default();

        if let Some(existing) = cached_by_path.get(&key) {
            if existing.updated_at == mtime {
                next_entries.push(existing.clone());
                continue;
            }
        }

        if let Some(history_entry) = extract_entry_from_file(entry.path(), false) {
            next_entries.push(history_entry);
        }
    }

    next_entries.retain(|entry| {
        let key = history_path_key(Path::new(&entry.path));
        paths_in_fs.contains(&key)
    });

    Ok(next_entries)
}

fn history_cache() -> &'static Mutex<Option<Vec<HistoryEntry>>> {
    HISTORY_CACHE.get_or_init(|| Mutex::new(None))
}

fn load_cached_history_entries() -> io::Result<Vec<HistoryEntry>> {
    if let Ok(guarded) = history_cache().lock() {
        if let Some(entries) = guarded.as_ref() {
            return Ok(entries.clone());
        }
    }

    let loaded = read_history_file()?;
    store_cached_history_entries(loaded.clone());
    Ok(loaded)
}

fn store_cached_history_entries(entries: Vec<HistoryEntry>) {
    if let Ok(mut guarded) = history_cache().lock() {
        *guarded = Some(entries);
    }
}

fn read_history_file() -> io::Result<Vec<HistoryEntry>> {
    let primary = codexia_history_path();
    let fallback = legacy_plux_history_path();
    let read_target = if primary.exists() {
        Some(primary)
    } else if fallback.exists() {
        Some(fallback)
    } else {
        None
    };

    let Some(path) = read_target else {
        return Ok(Vec::new());
    };

    let file = File::open(path)?;
    let reader = BufReader::new(file);
    let mut entries = Vec::new();
    for line in reader.lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(entry) = serde_json::from_str::<HistoryEntry>(&line) {
            entries.push(entry);
        }
    }
    Ok(entries)
}

fn scan_archived_sessions() -> io::Result<Vec<HistoryEntry>> {
    let sessions_root = codex_home().join("archived_sessions");
    let mut entries = Vec::new();
    if sessions_root.exists() {
        collect_entries(&sessions_root, &mut entries, true);
    }

    Ok(entries)
}

fn collect_entries(root: &Path, entries: &mut Vec<HistoryEntry>, archived: bool) {
    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        if entry.path().extension().and_then(|s| s.to_str()) != Some("jsonl") {
            continue;
        }

        if let Some(history_entry) = extract_entry_from_file(entry.path(), archived) {
            entries.push(history_entry);
        }
    }
}

fn extract_entry_from_file(path: &Path, archived: bool) -> Option<HistoryEntry> {
    let file = File::open(path).ok()?;
    let reader = BufReader::new(file);
    let mut lines: Vec<String> = Vec::new();
    for line in reader.lines().flatten() {
        lines.push(line);
    }
    if lines.len() < 5 {
        return None;
    }

    let row1 = parse_json_line(&lines[0])?;
    let payload = row1.get("payload")?.as_object()?;
    let id = payload.get("id")?.as_str()?.to_string();
    let cwd = payload
        .get("cwd")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();
    let source = payload
        .get("source")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();
    let ts_str = payload
        .get("timestamp")
        .and_then(|v| v.as_str())
        .or_else(|| row1.get("timestamp").and_then(|v| v.as_str()));
    let ts = ts_str.and_then(parse_ts).unwrap_or(0);

    let mut preview = String::new();
    for line in lines.iter().skip(1).take(12) {
        let value = match parse_json_line(line) {
            Some(value) => value,
            None => continue,
        };
        if let Some(text) = extract_preview(&value) {
            preview = text;
            break;
        }
    }

    if preview.is_empty() {
        return None;
    }

    let updated_at = file_mtime(path).unwrap_or(ts);

    Some(HistoryEntry {
        id,
        preview,
        cwd,
        path: path.to_string_lossy().to_string(),
        source,
        ts,
        updated_at,
        archived,
    })
}

fn write_history(entries: &[HistoryEntry]) -> io::Result<()> {
    let history_path = codexia_history_path();
    if let Some(parent) = history_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let mut file = File::create(history_path)?;
    for entry in entries {
        serde_json::to_writer(&mut file, entry)?;
        file.write_all(b"\n")?;
    }

    Ok(())
}
