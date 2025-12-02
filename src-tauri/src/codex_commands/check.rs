use tauri::State;
use crate::codex_commands::state::CodexState;

#[tauri::command]
pub async fn check_codex_version(
) -> Result<String, String> {
    codex_client::services::codex::check_codex_version().await
}

#[tauri::command]
pub async fn check_coder_version(
) -> Result<String, String> {
    codex_client::services::coder::check_coder_version().await
}

#[tauri::command]
pub async fn get_client_name(state: State<'_, CodexState>) -> Result<String, String> {
    codex_client::state::get_client_name(&state.client_state).await
}

#[tauri::command]
pub async fn set_client_name(state: State<'_, CodexState>, name: String) -> Result<(), String> {
    codex_client::state::set_client_name(&state.client_state, name).await
}
