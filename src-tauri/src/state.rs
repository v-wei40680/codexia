use crate::codex_client::CodexClient;
use notify::RecommendedWatcher;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct CodexState {
    pub sessions: Arc<Mutex<HashMap<String, CodexClient>>>,
    // Active filesystem watchers keyed by absolute folder path
    pub watchers: Arc<Mutex<HashMap<String, RecommendedWatcher>>>,
}

impl CodexState {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            watchers: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}
