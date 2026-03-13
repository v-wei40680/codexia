use crate::features::event_sink::EventSink;
use claude_agent_sdk_rs::{ClaudeAgentOptions, ClaudeClient};
use dashmap::DashMap;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::{oneshot, Mutex as AsyncMutex, RwLock};

pub type ClientId = String;

/// Session-specific metadata
pub struct SessionMetadata {
    pub permission_mode: Option<String>,
}

#[derive(Clone)]
pub struct CCState {
    pub clients: Arc<AsyncMutex<HashMap<ClientId, Arc<RwLock<ClaudeClient>>>>>,
    /// Pending permission requests: request_id -> oneshot sender for the decision
    pub pending_permissions: Arc<DashMap<String, oneshot::Sender<String>>>,
    /// Session metadata (permission_mode, etc.)
    pub session_metadata: Arc<DashMap<ClientId, SessionMetadata>>,
    /// Aliases for session IDs: real_sdk_id -> temp_uuid (internal client key).
    /// Used when the SDK assigns its own session_id that differs from our temp UUID.
    pub session_aliases: Arc<DashMap<String, String>>,
    /// Arc<Mutex<String>> for each session's effective ID, shared with permission hooks.
    /// Updated from temp UUID to real SDK session_id when System::init arrives.
    pub session_arcs: Arc<DashMap<String, Arc<Mutex<String>>>>,
    /// Event sink for emitting events to the frontend (Tauri or WebSocket).
    pub sink: Arc<dyn EventSink>,
}

struct NoOpSink;
impl EventSink for NoOpSink {
    fn emit(&self, _event: &str, _payload: Value) {}
}

impl CCState {
    pub fn new(sink: Arc<dyn EventSink>) -> Self {
        Self {
            clients: Arc::new(AsyncMutex::new(HashMap::new())),
            pending_permissions: Arc::new(DashMap::new()),
            session_metadata: Arc::new(DashMap::new()),
            session_aliases: Arc::new(DashMap::new()),
            session_arcs: Arc::new(DashMap::new()),
            sink,
        }
    }

    pub fn emit(&self, event: &str, payload: Value) {
        self.sink.emit(event, payload);
    }

    pub async fn get_client(&self, client_id: &str) -> Option<Arc<RwLock<ClaudeClient>>> {
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
            let mut old_client = old_client.write().await;
            let _ = old_client.disconnect().await;
        }

        let client = ClaudeClient::new(options);
        clients.insert(client_id.clone(), Arc::new(RwLock::new(client)));

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
            let mut client = client.write().await;
            client.disconnect().await.map_err(|e| e.to_string())?;
        }
        self.session_metadata.remove(client_id);
        self.session_arcs.remove(client_id);
        // Remove any aliases that point to this client
        self.session_aliases.retain(|_, v| v.as_str() != client_id);
        Ok(())
    }

    pub fn get_permission_mode(&self, session_id: &str) -> Option<String> {
        if let Some(meta) = self.session_metadata.get(session_id) {
            return meta.permission_mode.clone();
        }
        // Alias fallback: real_id → temp_uuid key
        if let Some(canonical) = self.session_aliases.get(session_id) {
            return self.session_metadata
                .get(canonical.as_str())
                .and_then(|m| m.permission_mode.clone());
        }
        None
    }

    pub fn set_permission_mode(&self, session_id: &str, mode: String) {
        // Try direct key first, then alias
        let key = if self.session_metadata.contains_key(session_id) {
            session_id.to_string()
        } else if let Some(canonical) = self.session_aliases.get(session_id) {
            canonical.clone()
        } else {
            session_id.to_string()
        };
        if let Some(mut meta) = self.session_metadata.get_mut(&key) {
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
        Self::new(Arc::new(NoOpSink))
    }
}
