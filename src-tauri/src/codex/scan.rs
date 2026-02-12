use std::fs::{self, File};
use std::io::{self, BufRead, BufReader, Write};
use std::path::Path;
use std::sync::Arc;
use std::time::{Duration, Instant};

use super::event_sink::EventSink;
use super::utils::{
    codex_home, extract_preview, file_mtime, parse_json_line, parse_ts, plux_history_path,
};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::HashMap;
use walkdir::WalkDir;

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
    let sessions_root = codex_home().join("sessions");
    if !sessions_root.exists() {
        return;
    }

    let _ = scan_and_emit(&*event_sink);

    std::thread::spawn(move || {
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
                Ok(_) => {
                    if last_scan.elapsed() < Duration::from_millis(500) {
                        continue;
                    }
                    last_scan = Instant::now();
                    let _ = scan_and_emit(&*event_sink);
                }
                Err(_) => break,
            }
        }
    });
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
    let mut entries = scan_sessions()?;
    entries.sort_by(|a, b| b.ts.cmp(&a.ts));
    write_history(&entries)?;
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
        scan_history_entries()?
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

fn scan_and_emit(event_sink: &dyn EventSink) -> io::Result<()> {
    let entries = scan_history_entries()?;
    let non_empty_entries = entries
        .into_iter()
        .filter(|entry| !entry.preview.trim().is_empty())
        .collect::<Vec<_>>();

    let payload = json!({
        "data": history_entries_to_thread_values(&non_empty_entries),
        "nextCursor": null
    });
    event_sink.emit("thread/list-updated", payload);

    Ok(())
}

fn repo_root_for_path(path: &str) -> Option<String> {
    let repo = gix::discover(path).ok()?;
    let root = repo.workdir()?;
    Some(root.to_string_lossy().to_string())
}

fn scan_sessions() -> io::Result<Vec<HistoryEntry>> {
    let sessions_root = codex_home().join("sessions");
    let mut entries = Vec::new();
    if sessions_root.exists() {
        collect_entries(&sessions_root, &mut entries, false);
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
    let history_path = plux_history_path();
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
