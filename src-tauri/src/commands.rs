use crate::services::{codex, coder, remote};
use crate::state::{RemoteAccessState, RemoteUiStatus};
use tauri::{AppHandle, State};

pub use remote::RemoteUiConfigPayload;

#[tauri::command]
pub async fn check_codex_version() -> Result<String, String> {
    codex::check_codex_version().await
}

#[tauri::command]
pub async fn check_coder_version() -> Result<String, String> {
    coder::check_coder_version().await
}

#[tauri::command]
pub async fn create_new_window(app: AppHandle) -> Result<(), String> {
    use tauri::{WebviewUrl, WebviewWindowBuilder};

    let window_label = format!("main-{}", chrono::Utc::now().timestamp_millis());

    let window = WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::default())
        .title("Codexia")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .decorations(true)
        .resizable(true)
        .fullscreen(false)
        .build()
        .map_err(|e| format!("Failed to create new window: {}", e))?;

    // Focus the new window
    window
        .set_focus()
        .map_err(|e| format!("Failed to focus window: {}", e))?;

    Ok(())
}

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
