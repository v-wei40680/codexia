use std::collections::HashSet;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::sync::{Arc, Mutex, Once, OnceLock};
use std::time::{Duration, Instant};

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde_json::json;

use crate::features::event_sink::EventSink;

use super::db::{SessionDB, SessionData};
use super::services::session_service;

type EventSinks = Arc<Mutex<Vec<Arc<dyn EventSink>>>>;

static SESSION_SCANNER_START: Once = Once::new();
static SESSION_SCANNER_SINKS: OnceLock<EventSinks> = OnceLock::new();

pub fn start_session_scanner(event_sink: Arc<dyn EventSink>) {
    let sinks = SESSION_SCANNER_SINKS
        .get_or_init(|| Arc::new(Mutex::new(Vec::new())))
        .clone();
    if let Ok(mut guarded) = sinks.lock() {
        guarded.push(Arc::clone(&event_sink));
    }

    let mut started_now = false;
    SESSION_SCANNER_START.call_once(|| {
        started_now = true;

        emit_sessions_to_sinks(&sinks);

        std::thread::spawn(move || {
            let home = match dirs::home_dir() {
                Some(path) => path,
                None => return,
            };
            let projects_root = home.join(".claude").join("projects");
            if !projects_root.exists() {
                return;
            }

            let (tx, rx) = std::sync::mpsc::channel();
            let mut watcher: RecommendedWatcher = match notify::recommended_watcher(tx) {
                Ok(watcher) => watcher,
                Err(err) => {
                    eprintln!("cc session scanner: watcher init failed: {err}");
                    return;
                }
            };

            if let Err(err) = watcher.watch(&projects_root, RecursiveMode::Recursive) {
                eprintln!("cc session scanner: watch failed: {err}");
                return;
            }

            // Pre-populate known IDs so Modify events on existing sessions don't re-emit.
            let mut known_session_ids: HashSet<String> = read_sessions()
                .into_iter()
                .map(|s| s.session_id)
                .collect();

            let mut last_scan = Instant::now() - Duration::from_secs(60);
            let mut pending_rescan = false;

            loop {
                match rx.recv_timeout(Duration::from_millis(200)) {
                    Ok(Ok(event)) => {
                        if !should_rescan_for_event(&event) {
                            continue;
                        }

                        if last_scan.elapsed() < Duration::from_millis(500) {
                            pending_rescan = true;
                        } else {
                            last_scan = Instant::now();
                            emit_sessions_if_changed(&sinks, &mut known_session_ids);
                            pending_rescan = false;
                        }
                    }
                    Ok(Err(err)) => {
                        eprintln!("cc session scanner: watch event error: {err}");
                    }
                    Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {}
                    Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
                }

                if pending_rescan && last_scan.elapsed() >= Duration::from_millis(500) {
                    last_scan = Instant::now();
                    emit_sessions_if_changed(&sinks, &mut known_session_ids);
                    pending_rescan = false;
                }
            }
        });
    });

    if !started_now {
        emit_sessions_to_sink(&*event_sink);
    }
}

fn should_rescan_for_event(event: &Event) -> bool {
    if matches!(event.kind, EventKind::Access(_)) {
        return false;
    }

    let is_relevant_kind = matches!(
        event.kind,
        EventKind::Create(_) | EventKind::Remove(_) | EventKind::Modify(_)
    );
    if !is_relevant_kind {
        return false;
    }

    event.paths.iter().any(|path| is_session_jsonl(path))
}

fn is_session_jsonl(path: &Path) -> bool {
    if path.extension().and_then(|ext| ext.to_str()) != Some("jsonl") {
        return false;
    }

    let file_name = path.file_name().and_then(|name| name.to_str()).unwrap_or("");
    !file_name.starts_with("agent-")
}

fn read_sessions() -> Vec<SessionData> {
    match session_service::get_sessions() {
        Ok(sessions) => sessions,
        Err(err) => {
            eprintln!("cc session scanner: failed to read sessions: {err}");
            Vec::new()
        }
    }
}

fn emit_sessions_to_sink(event_sink: &dyn EventSink) {
    let sessions = read_sessions();
    let payload = json!({
        "data": sessions,
    });
    event_sink.emit("session/list-updated", payload);
}

/// Only emit `session/list-updated` when the set of session IDs actually changes.
/// This prevents spurious refreshes caused by Modify events on active session files.
fn emit_sessions_if_changed(sinks: &EventSinks, known_ids: &mut HashSet<String>) {
    let sessions = read_sessions();
    let new_ids: HashSet<String> = sessions.iter().map(|s| s.session_id.clone()).collect();
    if new_ids == *known_ids {
        return;
    }
    *known_ids = new_ids;
    let payload = json!({ "data": sessions });
    let sink_list = match sinks.lock() {
        Ok(guarded) => guarded.clone(),
        Err(_) => Vec::new(),
    };
    for sink in sink_list {
        sink.emit("session/list-updated", payload.clone());
    }
}

fn emit_sessions_to_sinks(sinks: &EventSinks) {
    let sink_list = match sinks.lock() {
        Ok(guarded) => guarded.clone(),
        Err(_) => Vec::new(),
    };
    for sink in sink_list {
        emit_sessions_to_sink(&*sink);
    }
}

/// Scan projects directory and index session files into the database.
pub fn get_sessions() -> Result<Vec<SessionData>, String> {
    let db = SessionDB::new().map_err(|e| format!("Failed to open database: {}", e))?;
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let projects_dir = home.join(".claude").join("projects");

    if !projects_dir.exists() {
        return Ok(vec![]);
    }

    let slash_commands: Vec<&str> = vec!["/ide", "/model", "/status"];

    for entry in fs::read_dir(&projects_dir)
        .map_err(|e| format!("Failed to read projects dir: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let project_dir = entry.path();
        if !project_dir.is_dir() {
            continue;
        }

        for session_entry in fs::read_dir(&project_dir)
            .map_err(|e| format!("Failed to read project dir: {}", e))?
        {
            let session_entry =
                session_entry.map_err(|e| format!("Failed to read session entry: {}", e))?;
            let session_path = session_entry.path();

            if session_path.extension().and_then(|s| s.to_str()) != Some("jsonl") {
                continue;
            }

            let file_name = session_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");
            if file_name.starts_with("agent-") {
                continue;
            }

            let file_path_str = session_path.to_str().unwrap_or("");
            if db.is_scanned(file_path_str).unwrap_or(false) {
                continue;
            }

            if let Ok(file) = fs::File::open(&session_path) {
                let reader = BufReader::new(file);
                let mut session_id = String::new();
                let mut cwd = String::new();
                let mut timestamp: i64 = 0;
                let mut display = String::from("Untitled");
                let mut found_user_message = false;

                for line in reader.lines().filter_map(|l| l.ok()) {
                    let sanitized = line.replace('\u{0000}', "").trim().to_string();
                    if sanitized.is_empty() || !sanitized.ends_with('}') {
                        continue;
                    }

                    if let Ok(data) = serde_json::from_str::<serde_json::Value>(&sanitized) {
                        if session_id.is_empty() {
                            if let Some(sid) = data.get("sessionId").and_then(|s| s.as_str()) {
                                session_id = sid.to_string();
                            }
                        }
                        if cwd.is_empty() {
                            if let Some(c) = data.get("cwd").and_then(|c| c.as_str()) {
                                cwd = c.to_string();
                            }
                        }

                        if data.get("type").and_then(|t| t.as_str()) == Some("user") {
                            timestamp = data
                                .get("timestamp")
                                .and_then(|t| t.as_str())
                                .and_then(|t| chrono::DateTime::parse_from_rfc3339(t).ok())
                                .map(|dt| dt.timestamp())
                                .unwrap_or(0);

                            if let Some(msg_display) = data
                                .get("message")
                                .and_then(|m| m.get("content"))
                                .and_then(|c| c.as_str())
                            {
                                if slash_commands.contains(&msg_display.trim()) {
                                    break;
                                }
                                display = msg_display
                                    .lines()
                                    .next()
                                    .unwrap_or("Untitled")
                                    .to_string();
                                found_user_message = true;
                                break;
                            }
                        }
                    }
                }

                if found_user_message && !session_id.is_empty() && !cwd.is_empty() {
                    let session = SessionData {
                        session_id,
                        project: cwd,
                        display,
                        timestamp,
                    };
                    let _ = db.insert_session(&session, file_path_str);
                }
            }
        }
    }

    db.get_all_sessions()
        .map_err(|e| format!("Failed to get sessions: {}", e))
}
