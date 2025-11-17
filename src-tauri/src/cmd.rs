use codex_app_server_protocol::{
    AddConversationListenerParams,
    AddConversationSubscriptionResponse,
    InterruptConversationParams,
    InterruptConversationResponse,
    LoginAccountParams,
    LoginAccountResponse,
    LogoutAccountResponse,
    NewConversationParams,
    NewConversationResponse,
    RemoveConversationListenerParams,
    ResumeConversationParams,
    ResumeConversationResponse,
    SendUserMessageParams,
    SendUserMessageResponse,
    TurnStartParams,
    TurnStartResponse,
    CancelLoginAccountResponse,
    GetAccountResponse,
    GetAccountRateLimitsResponse,
};
use codex_protocol::protocol::ReviewDecision;
use log::{error, info, warn};
use tauri::{AppHandle, State};

use crate::state::{AppState, get_client};

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
pub async fn respond_exec_command_request(
    request_token: String,
    decision: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let client = get_client(&state, &app_handle).await?;
    let parsed = parse_review_decision(&decision)?;
    client
        .respond_exec_command_request(&request_token, parsed)
        .await
}

#[tauri::command]
pub async fn respond_apply_patch_request(
    request_token: String,
    decision: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let client = get_client(&state, &app_handle).await?;
    let parsed = parse_review_decision(&decision)?;
    client
        .respond_apply_patch_request(&request_token, parsed)
        .await
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
        Ok(conversation) => {
            Ok(conversation)
        }
        Err(err) => {
            error!("Failed to resume conversation from {:?}: {err}", path);
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn get_account(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    refresh_token: Option<bool>,
) -> Result<GetAccountResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    client
        .get_account(refresh_token.unwrap_or(false))
        .await
}

#[tauri::command]
pub async fn get_account_rate_limits(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<GetAccountRateLimitsResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    client.get_account_rate_limits().await
}

#[tauri::command]
pub async fn login_account_chatgpt(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<LoginAccountResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    client
        .login_account(LoginAccountParams::Chatgpt)
        .await
}

#[tauri::command]
pub async fn login_account_api_key(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    api_key: String,
) -> Result<LoginAccountResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    client
        .login_account(LoginAccountParams::ApiKey { api_key })
        .await
}

#[tauri::command]
pub async fn cancel_login_account(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    login_id: String,
) -> Result<CancelLoginAccountResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    client.cancel_login_account(login_id).await
}

#[tauri::command]
pub async fn logout_account(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<LogoutAccountResponse, String> {
    let client = get_client(&state, &app_handle).await?;
    client.logout_account().await
}

fn parse_review_decision(decision: &str) -> Result<ReviewDecision, String> {
    let normalized = decision.trim().to_lowercase().replace('-', "_");
    match normalized.as_str() {
        "approved" => Ok(ReviewDecision::Approved),
        "approved_for_session" => Ok(ReviewDecision::ApprovedForSession),
        "denied" => Ok(ReviewDecision::Denied),
        "abort" => Ok(ReviewDecision::Abort),
        other => Err(format!("Unsupported review decision: {other}")),
    }
}
