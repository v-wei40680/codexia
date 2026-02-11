use serde_json::Value;
use tauri::Emitter;
use tokio::sync::broadcast;

pub trait EventSink: Send + Sync {
    fn emit(&self, event: &str, payload: Value);
}

pub struct TauriEventSink {
    app_handle: tauri::AppHandle,
}

impl TauriEventSink {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self { app_handle }
    }
}

impl EventSink for TauriEventSink {
    fn emit(&self, event: &str, payload: Value) {
        let _ = self.app_handle.emit(event, payload);
    }
}

pub struct WebSocketEventSink {
    tx: broadcast::Sender<(String, Value)>,
}

impl WebSocketEventSink {
    pub fn new(tx: broadcast::Sender<(String, Value)>) -> Self {
        Self { tx }
    }
}

impl EventSink for WebSocketEventSink {
    fn emit(&self, event: &str, payload: Value) {
        let _ = self.tx.send((event.to_string(), payload));
    }
}
