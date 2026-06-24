use serde_json::Value;
use tauri::Emitter;

pub use codexia_shared::event_sink::EventSink;

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
