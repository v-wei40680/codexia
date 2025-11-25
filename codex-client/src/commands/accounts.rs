use codex_app_server_protocol::{
    CancelLoginAccountResponse,
    GetAccountRateLimitsResponse,
    GetAccountResponse,
    LoginAccountParams,
    LoginAccountResponse,
    LogoutAccountResponse,
};
use tauri::{AppHandle, State};

use crate::state::{get_client, AppState};

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
