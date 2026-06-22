use serde_json::Value;

#[cfg(feature = "web")]
use tokio::sync::broadcast;

pub trait EventSink: Send + Sync {
    fn emit(&self, event: &str, payload: Value);
}

// Only needed by the standalone web server (server_web.rs).
#[cfg(feature = "web")]
pub struct WebSocketEventSink {
    tx: broadcast::Sender<(String, Value)>,
}

#[cfg(feature = "web")]
impl WebSocketEventSink {
    pub fn new(tx: broadcast::Sender<(String, Value)>) -> Self {
        Self { tx }
    }
}

#[cfg(feature = "web")]
impl EventSink for WebSocketEventSink {
    fn emit(&self, event: &str, payload: Value) {
        let _ = self.tx.send((event.to_string(), payload));
    }
}
