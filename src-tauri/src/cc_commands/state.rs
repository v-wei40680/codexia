use claude_agent_sdk::{ClaudeSDKClient, ClaudeAgentOptions, PermissionMode};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

pub type ClientId = String;

pub struct CCState {
    clients: Arc<Mutex<HashMap<ClientId, Arc<Mutex<ClaudeSDKClient>>>>>,
}

impl CCState {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn get_client(&self, client_id: &str) -> Option<Arc<Mutex<ClaudeSDKClient>>> {
        let clients = self.clients.lock().await;
        clients.get(client_id).cloned()
    }

    pub async fn create_client(
        &self,
        client_id: String,
        cwd: PathBuf,
        model: Option<String>,
        permission_mode: Option<PermissionMode>,
        resume_id: Option<String>,
    ) -> Result<(), String> {
        let mut clients = self.clients.lock().await;

        if clients.contains_key(&client_id) {
            return Ok(());
        }

        let options = ClaudeAgentOptions {
            model,
            cwd: Some(cwd),
            permission_mode,
            resume: resume_id,
            stderr_callback: Some(Arc::new(|msg| {
                log::error!("[CC STDERR] {}", msg);
            })),
            ..Default::default()
        };

        let client = ClaudeSDKClient::new(options);
        clients.insert(client_id, Arc::new(Mutex::new(client)));

        Ok(())
    }

    pub async fn remove_client(&self, client_id: &str) -> Result<(), String> {
        let mut clients = self.clients.lock().await;
        if let Some(client) = clients.remove(client_id) {
            let mut client = client.lock().await;
            client.disconnect().await.map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

impl Default for CCState {
    fn default() -> Self {
        Self::new()
    }
}
