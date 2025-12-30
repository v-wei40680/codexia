use super::state::CCState;
use claude_agent_sdk::{ContentBlock, Message, PermissionMode};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::State;
use std::path::PathBuf;
use uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CCMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CCConnectParams {
    pub session_id: String,
    pub cwd: String,
    pub model: Option<String>,
    pub permission_mode: Option<String>,
    pub resume_id: Option<String>,
}

#[tauri::command]
pub async fn cc_connect(
    params: CCConnectParams,
    state: State<'_, CCState>,
) -> Result<(), String> {
    let permission_mode = params.permission_mode.as_ref().and_then(|mode| {
        match mode.as_str() {
            "default" => Some(PermissionMode::Default),
            "acceptEdits" => Some(PermissionMode::AcceptEdits),
            "plan" => Some(PermissionMode::Plan),
            "bypassPermissions" => Some(PermissionMode::BypassPermissions),
            _ => None,
        }
    });

    state.create_client(
        params.session_id.clone(),
        PathBuf::from(params.cwd),
        params.model,
        permission_mode,
        params.resume_id,
    ).await?;

    let client = state.get_client(&params.session_id).await
        .ok_or("Failed to get client")?;

    let mut client = client.lock().await;
    client.connect(None).await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn cc_send_message(
    session_id: String,
    message: String,
    state: State<'_, CCState>,
) -> Result<(), String> {
    let client = state.get_client(&session_id).await
        .ok_or("Client not found")?;

    let client = client.lock().await;
    client.query(&message).await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn cc_receive_response(
    session_id: String,
    state: State<'_, CCState>,
) -> Result<Vec<CCMessage>, String> {
    let client = state.get_client(&session_id).await
        .ok_or("Client not found")?;

    let client = client.lock().await;
    let mut stream = client.receive_response().await.map_err(|e| e.to_string())?;

    let mut messages = Vec::new();
    while let Some(msg) = stream.next().await {
        if let Message::Assistant { message, .. } = msg {
            for block in message.content {
                if let ContentBlock::Text { text } = block {
                    messages.push(CCMessage {
                        role: "assistant".to_string(),
                        content: text,
                    });
                }
            }
        }
    }

    Ok(messages)
}

#[tauri::command]
pub async fn cc_disconnect(
    session_id: String,
    state: State<'_, CCState>,
) -> Result<(), String> {
    state.remove_client(&session_id).await
}

#[tauri::command]
pub async fn cc_new_session(
    cwd: String,
    model: Option<String>,
    permission_mode: Option<String>,
    state: State<'_, CCState>,
) -> Result<String, String> {
    let session_id = uuid::Uuid::new_v4().to_string();

    let permission_mode = permission_mode.as_ref().and_then(|mode| {
        match mode.as_str() {
            "default" => Some(PermissionMode::Default),
            "acceptEdits" => Some(PermissionMode::AcceptEdits),
            "plan" => Some(PermissionMode::Plan),
            "bypassPermissions" => Some(PermissionMode::BypassPermissions),
            _ => None,
        }
    });

    state.create_client(
        session_id.clone(),
        PathBuf::from(cwd),
        model,
        permission_mode,
        None,
    ).await?;

    let client = state.get_client(&session_id).await
        .ok_or("Failed to get client")?;

    let mut client = client.lock().await;
    client.connect(None).await.map_err(|e| e.to_string())?;

    Ok(session_id)
}

#[tauri::command]
pub async fn cc_interrupt(
    session_id: String,
    state: State<'_, CCState>,
) -> Result<(), String> {
    let client = state.get_client(&session_id).await
        .ok_or("Client not found")?;

    let client = client.lock().await;
    client.interrupt().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn cc_update_permission_mode(
    session_id: String,
    _permission_mode: String,
    state: State<'_, CCState>,
) -> Result<(), String> {
    let _client = state.get_client(&session_id).await
        .ok_or("Client not found")?;

    // Note: The SDK doesn't currently support changing permission mode after creation
    // This would need to be implemented by reconnecting with new options
    log::warn!("Changing permission mode after connect is not yet supported");

    Ok(())
}
