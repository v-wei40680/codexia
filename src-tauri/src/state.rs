
use notify::RecommendedWatcher;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use log::info;
use tauri::{AppHandle, State};

use crate::codex::CodexAppServerClient;

pub struct AppState {
    pub client: Arc<Mutex<Option<Arc<CodexAppServerClient>>>>,
    // Tracks the requested client name ("codex" or "coder"). Default is "codex".
    pub selected_client_name: Arc<RwLock<String>>,
    // Remembers which client name the active client was spawned with, to avoid unnecessary respawns.
    pub active_client_name: Arc<RwLock<Option<String>>>,
    // Active filesystem watchers keyed by absolute folder path with ref-count
    pub watchers: Arc<Mutex<HashMap<String, (RecommendedWatcher, usize)>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            client: Arc::new(Mutex::new(None)),
            selected_client_name: Arc::new(RwLock::new("codex".to_string())),
            active_client_name: Arc::new(RwLock::new(None)),
            watchers: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

pub async fn get_client(
    state: &State<'_, AppState>,
    app_handle: &AppHandle,
) -> Result<Arc<CodexAppServerClient>, String> {
    // Determine which client is requested
    let desired = { state.selected_client_name.read().await.clone() };

    // If we already have a client spawned with the same name, return it
    let already_active = { state.active_client_name.read().await.clone() };
    if let (Some(existing), Some(active_name)) = (
        { state.client.lock().await.clone() },
        already_active,
    ) {
        if active_name == desired {
            return Ok(existing);
        }
    }

    // Otherwise, (re)spawn the client matching the desired name
    info!("Starting {} app-server process", desired);
    let client = CodexAppServerClient::spawn(app_handle.clone(), &desired).await?;
    info!("{} app-server spawned", desired);

    // Save client and its active name atomically
    {
        let mut guard = state.client.lock().await;
        *guard = Some(client.clone());
    }
    {
        let mut name_guard = state.active_client_name.write().await;
        *name_guard = Some(desired);
    }
    Ok(client)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteUiStatus {
    pub running: bool,
    pub port: Option<u16>,
    pub bind_address: Option<String>,
    pub public_url: Option<String>,
    pub info_url: Option<String>,
    pub bundle_path: Option<String>,
    pub minimize_app: bool,
    pub application_ui: bool,
}

impl Default for RemoteUiStatus {
    fn default() -> Self {
        Self {
            running: false,
            port: None,
            bind_address: None,
            public_url: None,
            info_url: None,
            bundle_path: None,
            minimize_app: false,
            application_ui: false,
        }
    }
}

pub struct RemoteAccessState {
    pub status: Arc<RwLock<RemoteUiStatus>>,
}

impl Default for RemoteAccessState {
    fn default() -> Self {
        Self {
            status: Arc::new(RwLock::new(RemoteUiStatus::default())),
        }
    }
}

// Tauri commands to get and set the desired client name

#[tauri::command]
pub async fn get_client_name(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.selected_client_name.read().await.clone())
}

#[tauri::command]
pub async fn set_client_name(state: State<'_, AppState>, name: String) -> Result<(), String> {
    let normalized = name.trim().to_lowercase();
    if normalized != "codex" && normalized != "coder" {
        return Err("client_name must be 'codex' or 'coder'".to_string());
    }

    // Update selection
    {
        let mut guard = state.selected_client_name.write().await;
        *guard = normalized;
    }

    // Drop current active client; it will be respawned on demand
    {
        let mut client_guard = state.client.lock().await;
        *client_guard = None;
    }
    {
        let mut name_guard = state.active_client_name.write().await;
        *name_guard = None;
    }
    Ok(())
}
