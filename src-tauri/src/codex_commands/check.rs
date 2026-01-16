use tauri::State;
use crate::codex_commands::state::CodexState;
use crate::codex;

#[tauri::command]
pub async fn check_codex_version(
) -> Result<String, String> {
    codex::v1::services::codex::check_codex_version().await
}

#[tauri::command]
pub async fn check_coder_version(
) -> Result<String, String> {
    codex::v1::services::coder::check_coder_version().await
}

#[tauri::command]
pub async fn get_client_name(state: State<'_, CodexState>) -> Result<String, String> {
    codex::v1::state::get_client_name(&state.client_state).await
}

#[tauri::command]
pub async fn set_client_name(state: State<'_, CodexState>, name: String) -> Result<(), String> {
    codex::v1::state::set_client_name(&state.client_state, name).await
}
