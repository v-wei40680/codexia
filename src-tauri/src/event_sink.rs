#[cfg(feature = "core")]
pub use codexia_shared::event_sink::EventSink;

#[cfg(not(feature = "core"))]
use serde_json::Value;

#[cfg(not(feature = "core"))]
pub trait EventSink: Send + Sync {
    fn emit(&self, event: &str, payload: Value);
}

#[cfg(feature = "core")]
use serde_json::Value;

#[cfg(feature = "tauri")]
use tauri::Emitter;

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
        #[cfg(feature = "desktop")]
        codexia_shared::p2p_bridge::forward(event, &payload);
        let _ = self.app_handle.emit(event, payload);
    }
}
