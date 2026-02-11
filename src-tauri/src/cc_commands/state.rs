use claude_agent_sdk_rs::{ClaudeAgentOptions, ClaudeClient};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

pub type ClientId = String;

pub struct CCState {
    pub clients: Arc<Mutex<HashMap<ClientId, Arc<Mutex<ClaudeClient>>>>>,
}

impl CCState {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn get_client(&self, client_id: &str) -> Option<Arc<Mutex<ClaudeClient>>> {
        let clients = self.clients.lock().await;
        clients.get(client_id).cloned()
    }

    pub async fn create_client(
        &self,
        client_id: String,
        options: ClaudeAgentOptions,
    ) -> Result<(), String> {
        let mut clients = self.clients.lock().await;

        if clients.contains_key(&client_id) {
            return Ok(());
        }

        let client = ClaudeClient::new(options);
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
