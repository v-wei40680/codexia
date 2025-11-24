use codex_app_server_protocol::InitializeResponse;
use tauri::{AppHandle, State};

use crate::state::{get_client, AppState};

#[tauri::command]
pub async fn initialize_client(
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<InitializeResponse, String> {
    let _guard = state.initialize_lock.lock().await;
    let desired = { state.selected_client_name.read().await.clone() };
    {
        let initialized_name = { state.initialized_client_name.read().await.clone() };
        if let (Some(active_name), Some(response)) = (
            initialized_name,
            { state.initialize_response.lock().await.clone() },
        ) {
            if active_name == desired {
                return Ok(response);
            }
        }
    }

    let client = get_client(&state, &app_handle).await?;
    let response = client.initialize().await?;

    {
        let mut guard = state.initialize_response.lock().await;
        *guard = Some(response.clone());
    }
    {
        let mut name_guard = state.initialized_client_name.write().await;
        *name_guard = Some(desired);
    }

    Ok(response)
}
