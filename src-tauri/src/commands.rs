use tauri::{AppHandle, State};
use crate::protocol::CodexConfig;
use crate::state::CodexState;
use crate::codex_client::CodexClient;

#[tauri::command]
pub async fn start_codex_session(
    app: AppHandle,
    state: State<'_, CodexState>,
    session_id: String,
    config: CodexConfig,
) -> Result<(), String> {
    {
        let sessions = state.sessions.lock().await;
        if sessions.contains_key(&session_id) {
            return Ok(());
        }
    }
    
    let codex_client = CodexClient::new(&app, session_id.clone(), config).await
        .map_err(|e| format!("Failed to start Codex session: {}", e))?;
    
    state.sessions.lock().await.insert(session_id, codex_client);
    Ok(())
}

#[tauri::command]
pub async fn send_message(
    state: State<'_, CodexState>,
    session_id: String,
    message: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().await;
    if let Some(client) = sessions.get_mut(&session_id) {
        client.send_user_input(message).await
            .map_err(|e| format!("Failed to send message: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub async fn approve_execution(
    state: State<'_, CodexState>,
    session_id: String,
    approval_id: String,
    approved: bool,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().await;
    if let Some(client) = sessions.get_mut(&session_id) {
        client.send_exec_approval(approval_id, approved).await
            .map_err(|e| format!("Failed to send approval: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub async fn stop_session(
    state: State<'_, CodexState>,
    session_id: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().await;
    if let Some(mut client) = sessions.remove(&session_id) {
        client.shutdown().await
            .map_err(|e| format!("Failed to shutdown session: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub async fn get_running_sessions(
    state: State<'_, CodexState>,
) -> Result<Vec<String>, String> {
    let sessions = state.sessions.lock().await;
    Ok(sessions.keys().cloned().collect())
}