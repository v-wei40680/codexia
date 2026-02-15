use portable_pty::{CommandBuilder, MasterPty, PtySize, native_pty_system};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::io::Write;
use std::sync::{Arc, Mutex};
use tokio::sync::Mutex as AsyncMutex;
use tokio::sync::broadcast;
use uuid::Uuid;

#[derive(Default)]
pub(crate) struct WebTerminalState {
    sessions: AsyncMutex<HashMap<String, Arc<WebTerminalSession>>>,
}

struct WebTerminalSession {
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    child: Mutex<Box<dyn portable_pty::Child + Send>>,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct TerminalStartResponse {
    pub session_id: String,
    pub shell: String,
}

#[derive(Debug, Clone, Serialize)]
struct TerminalDataPayload {
    session_id: String,
    data: String,
}

#[derive(Debug, Clone, Serialize)]
struct TerminalExitPayload {
    session_id: String,
    message: String,
}

fn get_default_shell() -> String {
    #[cfg(target_os = "windows")]
    {
        return "powershell.exe".to_string();
    }

    #[cfg(target_os = "macos")]
    {
        return std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
    }
}

fn build_shell_command(cwd: Option<String>) -> (String, CommandBuilder) {
    let shell = get_default_shell();
    let mut cmd = CommandBuilder::new(shell.clone());

    #[cfg(target_os = "windows")]
    {
        cmd.arg("-NoLogo");
    }

    #[cfg(not(target_os = "windows"))]
    {
        cmd.arg("-i");
        cmd.arg("-l");
        cmd.env("TERM", "xterm-256color");
    }

    if let Some(path) = cwd
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    {
        cmd.cwd(path);
    }

    (shell, cmd)
}

fn emit_event(event_tx: &broadcast::Sender<(String, Value)>, event: &str, payload: impl Serialize) {
    match serde_json::to_value(payload) {
        Ok(value) => {
            let _ = event_tx.send((event.to_string(), value));
        }
        Err(err) => {
            log::error!("Failed to serialize terminal event payload: {}", err);
        }
    }
}

pub(crate) async fn terminal_start(
    state: &WebTerminalState,
    event_tx: broadcast::Sender<(String, Value)>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<TerminalStartResponse, String> {
    let pty_system = native_pty_system();
    let size = PtySize {
        cols: cols.unwrap_or(120),
        rows: rows.unwrap_or(30),
        pixel_width: 0,
        pixel_height: 0,
    };
    let pair = pty_system
        .openpty(size)
        .map_err(|err| format!("Failed to open PTY: {err}"))?;

    let session_id = Uuid::new_v4().to_string();
    let (shell, command) = build_shell_command(cwd);

    let child = pair
        .slave
        .spawn_command(command)
        .map_err(|err| format!("Failed to start shell: {err}"))?;
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|err| format!("Failed to clone PTY reader: {err}"))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|err| format!("Failed to get PTY writer: {err}"))?;

    let session = Arc::new(WebTerminalSession {
        master: Mutex::new(pair.master),
        writer: Mutex::new(writer),
        child: Mutex::new(child),
    });

    {
        let mut sessions = state.sessions.lock().await;
        sessions.insert(session_id.clone(), Arc::clone(&session));
    }

    let session_id_for_output = session_id.clone();
    std::thread::spawn(move || {
        let mut buf = [0_u8; 8192];
        loop {
            match std::io::Read::read(&mut reader, &mut buf) {
                Ok(0) => break,
                Ok(count) => {
                    let data = String::from_utf8_lossy(&buf[..count]).to_string();
                    emit_event(
                        &event_tx,
                        "terminal:data",
                        TerminalDataPayload {
                            session_id: session_id_for_output.clone(),
                            data,
                        },
                    );
                }
                Err(_) => break,
            }
        }

        emit_event(
            &event_tx,
            "terminal:exit",
            TerminalExitPayload {
                session_id: session_id_for_output,
                message: "terminal closed".to_string(),
            },
        );
    });

    Ok(TerminalStartResponse { session_id, shell })
}

pub(crate) async fn terminal_write(
    state: &WebTerminalState,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let session = {
        let sessions = state.sessions.lock().await;
        sessions.get(&session_id).cloned()
    }
    .ok_or_else(|| "Terminal session not found".to_string())?;

    let mut writer = session
        .writer
        .lock()
        .map_err(|_| "Failed to lock terminal writer".to_string())?;
    writer
        .write_all(data.as_bytes())
        .map_err(|err| format!("Failed to write terminal input: {err}"))?;
    writer
        .flush()
        .map_err(|err| format!("Failed to flush terminal input: {err}"))?;

    Ok(())
}

pub(crate) async fn terminal_resize(
    state: &WebTerminalState,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let session = {
        let sessions = state.sessions.lock().await;
        sessions.get(&session_id).cloned()
    }
    .ok_or_else(|| "Terminal session not found".to_string())?;

    let master = session
        .master
        .lock()
        .map_err(|_| "Failed to lock terminal master".to_string())?;
    master
        .resize(PtySize {
            cols: cols.max(2),
            rows: rows.max(2),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|err| format!("Failed to resize terminal: {err}"))?;

    Ok(())
}

pub(crate) async fn terminal_stop(state: &WebTerminalState, session_id: String) -> Result<(), String> {
    let session = {
        let mut sessions = state.sessions.lock().await;
        sessions.remove(&session_id)
    }
    .ok_or_else(|| "Terminal session not found".to_string())?;

    let mut child = session
        .child
        .lock()
        .map_err(|_| "Failed to lock terminal child".to_string())?;
    child
        .kill()
        .map_err(|err| format!("Failed to stop terminal: {err}"))?;

    Ok(())
}
