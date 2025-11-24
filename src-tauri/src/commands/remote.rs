use tauri::{AppHandle, State};

use crate::services::remote;
use crate::state::{RemoteAccessState, RemoteUiStatus};

pub use remote::RemoteUiConfigPayload;

#[tauri::command]
pub async fn enable_remote_ui(
    app: AppHandle,
    state: State<'_, RemoteAccessState>,
    config: RemoteUiConfigPayload,
) -> Result<RemoteUiStatus, String> {
    remote::start_remote_ui(app, state, config).await
}

#[tauri::command]
pub async fn disable_remote_ui(
    app: AppHandle,
    state: State<'_, RemoteAccessState>,
) -> Result<RemoteUiStatus, String> {
    remote::stop_remote_ui(app, state).await
}

#[tauri::command]
pub async fn get_remote_ui_status(
    app: AppHandle,
    state: State<'_, RemoteAccessState>,
) -> Result<RemoteUiStatus, String> {
    remote::get_remote_ui_status(app, state).await
}
