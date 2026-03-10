use claude_agent_sdk_rs::{ClaudeAgentOptions, ClaudeClient};
use dashmap::DashMap;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{oneshot, Mutex};

pub type ClientId = String;

/// Session-specific metadata
pub struct SessionMetadata {
    pub permission_mode: Option<String>,
}

#[derive(Clone)]
pub struct CCState {
    pub clients: Arc<Mutex<HashMap<ClientId, Arc<Mutex<ClaudeClient>>>>>,
    /// Pending permission requests: request_id -> oneshot sender for the decision
    pub pending_permissions: Arc<DashMap<String, oneshot::Sender<String>>>,
    /// Session metadata (permission_mode, etc.)
    pub session_metadata: Arc<DashMap<ClientId, SessionMetadata>>,
    /// Aliases for session IDs: real_sdk_id -> temp_uuid (internal client key).
    /// Used when the SDK assigns its own session_id that differs from our temp UUID.
    pub session_aliases: Arc<DashMap<String, String>>,
}

impl CCState {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(Mutex::new(HashMap::new())),
            pending_permissions: Arc::new(DashMap::new()),
            session_metadata: Arc::new(DashMap::new()),
            session_aliases: Arc::new(DashMap::new()),
        }
    }

    pub async fn get_client(&self, client_id: &str) -> Option<Arc<Mutex<ClaudeClient>>> {
        let clients = self.clients.lock().await;
        if let Some(client) = clients.get(client_id) {
            return Some(client.clone());
        }
        // Fall back to alias lookup (real SDK session_id → temp UUID key)
        if let Some(canonical) = self.session_aliases.get(client_id) {
            return clients.get(canonical.as_str()).cloned();
        }
        None
    }

    /// Register an alias so that `alias` resolves to the client stored under `canonical`.
    /// Used when the SDK assigns a real session_id that differs from our temp UUID.
    pub fn add_session_alias(&self, alias: &str, canonical: &str) {
        self.session_aliases.insert(alias.to_string(), canonical.to_string());
    }

    pub async fn create_client(
        &self,
        client_id: String,
        options: ClaudeAgentOptions,
        permission_mode: Option<String>,
    ) -> Result<(), String> {
        let mut clients = self.clients.lock().await;

        // Note: we always replace the client to ensure new options (like emitter/hooks) are used.
        // If there was an existing connected client, we should probably disconnect it first.
        if let Some(old_client) = clients.get(&client_id) {
            let mut old_client = old_client.lock().await;
            let _ = old_client.disconnect().await;
        }

        let client = ClaudeClient::new(options);
        clients.insert(client_id.clone(), Arc::new(Mutex::new(client)));

        // Store session metadata
        self.session_metadata.insert(
            client_id,
            SessionMetadata { permission_mode },
        );

        Ok(())
    }

    pub async fn remove_client(&self, client_id: &str) -> Result<(), String> {
        let mut clients = self.clients.lock().await;
        if let Some(client) = clients.remove(client_id) {
            let mut client = client.lock().await;
            client.disconnect().await.map_err(|e| e.to_string())?;
        }
        self.session_metadata.remove(client_id);
        // Remove any aliases that point to this client
        self.session_aliases.retain(|_, v| v.as_str() != client_id);
        Ok(())
    }

    pub fn get_permission_mode(&self, session_id: &str) -> Option<String> {
        self.session_metadata
            .get(session_id)
            .and_then(|meta| meta.permission_mode.clone())
    }

    pub fn set_permission_mode(&self, session_id: &str, mode: String) {
        if let Some(mut meta) = self.session_metadata.get_mut(session_id) {
            meta.permission_mode = Some(mode);
        }
    }

    pub fn resolve_permission(&self, request_id: &str, decision: String) -> Result<(), String> {
        if let Some((_, tx)) = self.pending_permissions.remove(request_id) {
            let _ = tx.send(decision);
            Ok(())
        } else {
            Err(format!("Permission request not found: {}", request_id))
        }
    }
}

impl Default for CCState {
    fn default() -> Self {
        Self::new()
    }
}
