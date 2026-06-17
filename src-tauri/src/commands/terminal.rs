use crate::shared::terminal::{
    TerminalDataPayload, TerminalExitPayload, TerminalResizeParams, TerminalSession,
    TerminalStartResponse, TerminalState, TerminalStopParams, TerminalWriteParams,
    build_shell_command, create_pty_pair, kill_terminal, read_pty_output, resize_terminal,
    spawn_shell, write_terminal,
};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

#[tauri::command]
pub async fn terminal_start(
    app: AppHandle,
    state: State<'_, TerminalState>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<TerminalStartResponse, String> {
    let pair = create_pty_pair(cols.unwrap_or(120), rows.unwrap_or(30))?;

    let session_id = Uuid::new_v4().to_string();
    let (shell, command) = build_shell_command(cwd);

    let mut slave = pair.slave;
    let child = spawn_shell(&mut *slave, command)?;
    drop(slave);

    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|err| format!("Failed to clone PTY reader: {err}"))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|err| format!("Failed to get PTY writer: {err}"))?;

    let session = Arc::new(TerminalSession {
        master: std::sync::Mutex::new(pair.master),
        writer: std::sync::Mutex::new(writer),
        child: std::sync::Mutex::new(child),
    });

    {
        let mut sessions = state.sessions.lock().await;
        sessions.insert(session_id.clone(), Arc::clone(&session));
    }

    let session_id_for_output = session_id.clone();
    let app_for_output = app.clone();
    std::thread::spawn(move || {
        let session_id_for_exit = session_id_for_output.clone();
        let app_for_exit = app_for_output.clone();
        read_pty_output(reader, move |data| {
            let payload = TerminalDataPayload {
                session_id: session_id_for_output.clone(),
                data,
            };
            let _ = app_for_output.emit("terminal:data", payload);
        });

        let _ = app_for_exit.emit(
            "terminal:exit",
            TerminalExitPayload {
                session_id: session_id_for_exit,
                message: "terminal closed".to_string(),
            },
        );
    });

    Ok(TerminalStartResponse { session_id, shell })
}

#[tauri::command]
pub async fn terminal_write(
    state: State<'_, TerminalState>,
    params: TerminalWriteParams,
) -> Result<(), String> {
    let session = {
        let sessions = state.sessions.lock().await;
        sessions.get(&params.session_id).cloned()
    }
    .ok_or_else(|| "Terminal session not found".to_string())?;

    write_terminal(&session.writer, &params.data)
}

#[tauri::command]
pub async fn terminal_resize(
    state: State<'_, TerminalState>,
    params: TerminalResizeParams,
) -> Result<(), String> {
    let session = {
        let sessions = state.sessions.lock().await;
        sessions.get(&params.session_id).cloned()
    }
    .ok_or_else(|| "Terminal session not found".to_string())?;

    resize_terminal(&session.master, params.cols, params.rows)
}

#[tauri::command]
pub async fn terminal_stop(
    state: State<'_, TerminalState>,
    params: TerminalStopParams,
) -> Result<(), String> {
    let session = {
        let mut sessions = state.sessions.lock().await;
        sessions.remove(&params.session_id)
    }
    .ok_or_else(|| "Terminal session not found".to_string())?;

    kill_terminal(&session.child)
}
