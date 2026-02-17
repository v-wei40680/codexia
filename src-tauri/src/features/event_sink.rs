use serde_json::Value;
#[cfg(feature = "web")]
use tokio::sync::broadcast;

#[cfg(feature = "tauri")]
use tauri::Emitter;

pub trait EventSink: Send + Sync {
    fn emit(&self, event: &str, payload: Value);
}

#[cfg(feature = "tauri")]
pub struct TauriEventSink {
    app_handle: tauri::AppHandle,
}

#[cfg(feature = "tauri")]
impl TauriEventSink {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self { app_handle }
    }
}

#[cfg(feature = "tauri")]
impl EventSink for TauriEventSink {
    fn emit(&self, event: &str, payload: Value) {
        let _ = self.app_handle.emit(event, payload);
    }
}

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
