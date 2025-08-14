use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::codex_client::CodexClient;

pub struct CodexState {
    pub sessions: Arc<Mutex<HashMap<String, CodexClient>>>,
}

impl CodexState {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}