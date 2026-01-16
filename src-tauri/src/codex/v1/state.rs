use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use log::info;

use crate::codex::v1::client::CodexAppServerClient;
use crate::codex::v1::events::EventBus;
use codex_app_server_protocol::InitializeResponse;

/// Client state - manages the codex app-server client and configuration
/// This replaces the Tauri-dependent AppState
pub struct ClientState {
    pub client: Arc<Mutex<Option<Arc<CodexAppServerClient>>>>,
    pub initialize_lock: Arc<Mutex<()>>,
    pub initialize_response: Arc<Mutex<Option<InitializeResponse>>>,
    pub initialized_client_name: Arc<RwLock<Option<String>>>,
    /// Tracks the requested client name ("codex" or "coder"). Default is "codex".
    pub selected_client_name: Arc<RwLock<String>>,
    /// Remembers which client name the active client was spawned with, to avoid unnecessary respawns.
    pub active_client_name: Arc<RwLock<Option<String>>>,
    /// Event bus for emitting events (replaces Tauri's event system)
    pub event_bus: Arc<EventBus>,
}

impl ClientState {
    pub fn new() -> Self {
        Self {
            client: Arc::new(Mutex::new(None)),
            initialize_lock: Arc::new(Mutex::new(())),
            initialize_response: Arc::new(Mutex::new(None)),
            initialized_client_name: Arc::new(RwLock::new(None)),
            selected_client_name: Arc::new(RwLock::new("codex".to_string())),
            active_client_name: Arc::new(RwLock::new(None)),
            event_bus: Arc::new(EventBus::new()),
        }
    }
}

impl Default for ClientState {
    fn default() -> Self {
        Self::new()
    }
}

/// Get or create the codex app-server client
///
/// This function checks if a client is already running with the desired name.
/// If not, it spawns a new client process.
pub async fn get_client(state: &ClientState) -> Result<Arc<CodexAppServerClient>, String> {
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
    let client = CodexAppServerClient::spawn(state.event_bus.clone(), &desired).await?;
    info!("{} app-server spawned", desired);

    // Save client and its active name atomically
    {
        let mut guard = state.client.lock().await;
        *guard = Some(client.clone());
    }
    {
        let mut init_guard = state.initialize_response.lock().await;
        *init_guard = None;
    }
    {
        let mut initialized_name_guard = state.initialized_client_name.write().await;
        *initialized_name_guard = None;
    }
    {
        let mut name_guard = state.active_client_name.write().await;
        *name_guard = Some(desired);
    }
    Ok(client)
}
/// Get the desired client name ("codex" or "coder")
pub async fn get_client_name(state: &ClientState) -> Result<String, String> {
    Ok(state.selected_client_name.read().await.clone())
}

/// Set the desired client name and reset the active client
///
/// The next call to get_client() will spawn the new client type
pub async fn set_client_name(state: &ClientState, name: String) -> Result<(), String> {
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
        let mut init_guard = state.initialize_response.lock().await;
        *init_guard = None;
    }
    {
        let mut initialized_name_guard = state.initialized_client_name.write().await;
        *initialized_name_guard = None;
    }
    {
        let mut name_guard = state.active_client_name.write().await;
        *name_guard = None;
    }
    Ok(())
}
