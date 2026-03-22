/// Bridge that forwards Tauri events to the P2P backend WebSocket broadcast channel.
/// When the P2P backend starts, it registers its sender here.
/// TauriEventSink calls `forward` on every emit so mobile WS clients get the same events.
use std::sync::OnceLock;

use serde_json::Value;
use tokio::sync::broadcast;

static P2P_TX: OnceLock<broadcast::Sender<(String, Value)>> = OnceLock::new();

pub fn register(tx: broadcast::Sender<(String, Value)>) {
    let _ = P2P_TX.set(tx);
}

pub fn get_sender() -> Option<&'static broadcast::Sender<(String, Value)>> {
    P2P_TX.get()
}

pub fn forward(event: &str, payload: &Value) {
    if let Some(tx) = P2P_TX.get() {
        let _ = tx.send((event.to_string(), payload.clone()));
    }
}
