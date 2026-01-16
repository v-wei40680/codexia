use tauri::State;
use crate::codex_commands::state::CodexState;
use crate::codex;
use codex_protocol::protocol::ReviewDecision;
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
    InitializeResponse,
    CancelLoginAccountResponse,
    GetAccountRateLimitsResponse,
    GetAccountResponse,
    LoginAccountParams,
    LoginAccountResponse,
    LogoutAccountResponse,
    AddConversationListenerParams,
    AddConversationSubscriptionResponse,
    RemoveConversationListenerParams,
};

#[tauri::command]
pub async fn initialize_client(
    state: State<'_, CodexState>,
) -> Result<InitializeResponse, String> {
    // Check if already initialized
    {
        let response_guard = state.client_state.initialize_response.lock().await;
        if let Some(cached_response) = response_guard.as_ref() {
            // Trigger background scan if already initialized
            tokio::spawn(async {
                if let Err(e) = codex::v1::session_files::scan_and_cache_projects().await {
                    eprintln!("Background scan failed: {}", e);
                }
            });
            return Ok(cached_response.clone());
        }
    }

    let client = codex::v1::state::get_client(&state.client_state).await?;
    let response = client.initialize().await?;

    // Cache the response
    {
        let mut response_guard = state.client_state.initialize_response.lock().await;
        *response_guard = Some(response.clone());
    }

    // Trigger background scan after initialization
    tokio::spawn(async {
        if let Err(e) = codex::v1::session_files::scan_and_cache_projects().await {
            eprintln!("Background scan failed: {}", e);
        }
    });

    Ok(response)
}

#[tauri::command]
pub async fn new_conversation(
    params: NewConversationParams,
    overrides: Option<NewConversationParams>,
    state: State<'_, CodexState>,
) -> Result<NewConversationResponse, String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    client.new_conversation(params, overrides).await
}

#[tauri::command]
pub async fn send_user_message(
    params: SendUserMessageParams,
    state: State<'_, CodexState>,
) -> Result<SendUserMessageResponse, String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    client.send_user_message(params).await
}

#[tauri::command]
pub async fn turn_start(
    params: TurnStartParams,
    state: State<'_, CodexState>,
) -> Result<TurnStartResponse, String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    client.turn_start(params).await
}

#[tauri::command]
pub async fn interrupt_conversation(
    params: InterruptConversationParams,
    state: State<'_, CodexState>,
) -> Result<InterruptConversationResponse, String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    client.interrupt_conversation(params).await
}

#[tauri::command]
pub async fn resume_conversation(
    params: ResumeConversationParams,
    overrides: Option<NewConversationParams>,
    state: State<'_, CodexState>,
) -> Result<ResumeConversationResponse, String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    client.resume_conversation(params, overrides).await
}

#[tauri::command]
pub async fn add_conversation_listener(
    params: AddConversationListenerParams,
    state: State<'_, CodexState>,
) -> Result<AddConversationSubscriptionResponse, String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    client.add_conversation_listener(params).await
}

#[tauri::command]
pub async fn remove_conversation_listener(
    params: RemoveConversationListenerParams,
    state: State<'_, CodexState>,
) -> Result<(), String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    client.remove_conversation_listener(params).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_account(
    state: State<'_, CodexState>,
    refresh_token: Option<bool>,
) -> Result<GetAccountResponse, String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    client.get_account(refresh_token.unwrap_or(false)).await
}

#[tauri::command]
pub async fn get_account_rate_limits(
    state: State<'_, CodexState>,
) -> Result<GetAccountRateLimitsResponse, String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    client.get_account_rate_limits().await
}

#[tauri::command]
pub async fn login_account_chatgpt(
    state: State<'_, CodexState>,
) -> Result<LoginAccountResponse, String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    client.login_account(LoginAccountParams::Chatgpt).await
}

#[tauri::command]
pub async fn login_account_api_key(
    state: State<'_, CodexState>,
    api_key: String,
) -> Result<LoginAccountResponse, String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    client.login_account(LoginAccountParams::ApiKey { api_key }).await
}

#[tauri::command]
pub async fn cancel_login_account(
    state: State<'_, CodexState>,
    login_id: String,
) -> Result<CancelLoginAccountResponse, String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    client.cancel_login_account(login_id).await
}

#[tauri::command]
pub async fn logout_account(
    state: State<'_, CodexState>,
) -> Result<LogoutAccountResponse, String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
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

#[tauri::command]
pub async fn respond_exec_command_request(
    request_token: String,
    decision: String,
    state: State<'_, CodexState>,
) -> Result<(), String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    let parsed = parse_review_decision(&decision)?;
    client.respond_exec_command_request(&request_token, parsed).await
}

#[tauri::command]
pub async fn respond_apply_patch_request(
    request_token: String,
    decision: String,
    state: State<'_, CodexState>,
) -> Result<(), String> {
    let client = codex::v1::state::get_client(&state.client_state).await?;
    let parsed = parse_review_decision(&decision)?;
    client.respond_apply_patch_request(&request_token, parsed).await
}
