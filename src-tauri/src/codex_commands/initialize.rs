use tauri::State;
use crate::codex_commands::state::CodexState;
use codex_client::codex_app_server_protocol::InitializeResponse;

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
                if let Err(e) = codex_client::session_files::scan_and_cache_projects().await {
                    eprintln!("Background scan failed: {}", e);
                }
            });
            return Ok(cached_response.clone());
        }
    }

    let client = codex_client::state::get_client(&state.client_state).await?;
    let response = client.initialize().await?;

    // Cache the response
    {
        let mut response_guard = state.client_state.initialize_response.lock().await;
        *response_guard = Some(response.clone());
    }

    // Trigger background scan after initialization
    tokio::spawn(async {
        if let Err(e) = codex_client::session_files::scan_and_cache_projects().await {
            eprintln!("Background scan failed: {}", e);
        }
    });

    Ok(response)
}
