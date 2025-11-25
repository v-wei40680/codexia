use codex_app_server_protocol::{
    AddConversationListenerParams, AddConversationSubscriptionResponse,
    RemoveConversationListenerParams,
};
use tauri::{AppHandle, State};

use crate::state::{get_client, AppState};

#[tauri::command]
pub async fn add_conversation_listener(
    params: AddConversationListenerParams,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<AddConversationSubscriptionResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    client.add_conversation_listener(params).await
}

#[tauri::command]
pub async fn remove_conversation_listener(
    params: RemoveConversationListenerParams,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let client = get_client(&state, &app_handle).await?;
    client.remove_conversation_listener(params).await.map(|_| ())
}
