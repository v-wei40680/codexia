#[cfg(target_os = "macos")]
use std::process::Command;
use tauri::{AppHandle, State};
use std::path::PathBuf;
use log::{error, info, warn};

use crate::services::{codex, coder, remote};
use crate::state::{RemoteAccessState, RemoteUiStatus};

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

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        warn!("delete_file invoked with empty path");
        return Err("Path is empty.".to_string());
    }

    info!("Deleting conversation file {}", trimmed);
    let path_buf = PathBuf::from(trimmed);
    tokio::fs::remove_file(path_buf)
        .await
        .map_err(|err| {
            error!("Failed to delete file {trimmed}: {err}");
            format!("Failed to delete file: {err}")
        })
}

#[tauri::command]
pub async fn set_system_env(key: String, value: String) -> Result<(), String> {
    let normalized_key = key.trim().to_string();
    if normalized_key.is_empty() {
        return Err("Environment variable key cannot be empty.".to_string());
    }

    std::env::set_var(&normalized_key, &value);
    info!("Set environment variable {}", normalized_key);

    #[cfg(target_os = "macos")]
    {
        if let Err(err) = Command::new("launchctl")
            .args(["setenv", &normalized_key, &value])
            .status()
        {
            warn!(
                "Failed to run launchctl setenv for {}: {err}",
                normalized_key
            );
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_system_env(key: String) -> Result<Option<String>, String> {
    let normalized_key = key.trim().to_string();
    if normalized_key.is_empty() {
        return Err("Environment variable key cannot be empty.".to_string());
    }

    Ok(std::env::var(normalized_key).ok())
}
