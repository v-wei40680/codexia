use std::path::Path;
use std::sync::{Arc, Mutex, Once, OnceLock};
use std::time::{Duration, Instant};

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde_json::json;

use crate::features::event_sink::EventSink;

use super::db::SessionData;
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
                            emit_sessions_to_sinks(&sinks);
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
                    emit_sessions_to_sinks(&sinks);
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

fn emit_sessions_to_sinks(sinks: &EventSinks) {
    let sink_list = match sinks.lock() {
        Ok(guarded) => guarded.clone(),
        Err(_) => Vec::new(),
    };
    for sink in sink_list {
        emit_sessions_to_sink(&*sink);
    }
}
