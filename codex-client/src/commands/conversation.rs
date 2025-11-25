use codex_app_server_protocol::{
    InterruptConversationParams,
    InterruptConversationResponse,
    NewConversationParams,
    NewConversationResponse,
    ResumeConversationParams,
    ResumeConversationResponse,
    SendUserMessageParams,
    SendUserMessageResponse,
    TurnStartParams,
    TurnStartResponse,
};
use log::{error, info, warn};
use tauri::{AppHandle, State};

use crate::state::{get_client, AppState};

#[tauri::command]
pub async fn new_conversation(
    params: NewConversationParams,
    overrides: Option<NewConversationParams>,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<NewConversationResponse, String> {
    info!("Creating new conversation; params {:?} ", params);
    let client = get_client(&state, &app_handle).await?;
    match client.new_conversation(params, overrides).await {
        Ok(conversation) => {
            info!(
                "New conversation created: {}",
                conversation.conversation_id
            );
            Ok(conversation)
        }
        Err(err) => {
            error!("Failed to create conversation: {err}");
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn send_user_message(
    params: SendUserMessageParams,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<SendUserMessageResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    let conversation_id = params.conversation_id.clone();
    let item_count = params.items.len();

    if item_count == 0 {
        warn!(
            "Attempted to send empty item list to conversation {}",
            conversation_id
        );
        return Err("Message items cannot be empty.".to_string());
    }

    info!(
        "Forwarding send_user_message to conversation {} (items={})",
        conversation_id, item_count
    );

    match client.send_user_message(params).await {
        Ok(response) => {
            info!("Message accepted for {}", conversation_id);
            Ok(response)
        }
        Err(err) => {
            error!("Failed to send message to {conversation_id}: {err}");
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn turn_start(
    params: TurnStartParams,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<TurnStartResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    let thread_id = params.thread_id.clone();
    let input_count = params.input.len();

    info!(
        "Forwarding turn_start to thread {} (items={})",
        thread_id, input_count
    );

    match client.turn_start(params).await {
        Ok(response) => {
            info!("Turn started for {}", thread_id);
            Ok(response)
        }
        Err(err) => {
            error!("Failed to start turn for {thread_id}: {err}");
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn interrupt_conversation(
    params: InterruptConversationParams,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<InterruptConversationResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    let conversation_id = params.conversation_id.clone();

    info!("Forwarding interrupt to conversation {}", conversation_id);

    match client.interrupt_conversation(params).await {
        Ok(response) => {
            info!(
                "Conversation {} interrupted ({:?})",
                conversation_id, response.abort_reason
            );
            Ok(response)
        }
        Err(err) => {
            error!("Failed to interrupt {conversation_id}: {err}");
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn resume_conversation(
    params: ResumeConversationParams,
    overrides: Option<NewConversationParams>,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<ResumeConversationResponse, String> {
    let path = params.path.clone();
    info!("Resuming conversation from {:?} ", path);
    let client = get_client(&state, &app_handle).await?;
    match client.resume_conversation(params, overrides).await {
        Ok(conversation) => Ok(conversation),
        Err(err) => {
            error!("Failed to resume conversation from {:?}: {err}", path);
            Err(err)
        }
    }
}
