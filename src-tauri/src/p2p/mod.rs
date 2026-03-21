pub mod commands;

/// STUN discovery — desktop + mobile
#[cfg(feature = "tauri")]
pub(crate) mod stun;

/// Quinn QUIC server + HTTP proxy → :7420 — desktop only
#[cfg(feature = "desktop")]
pub mod server;

/// Quinn QUIC client + local HTTP proxy — available on iOS (tauri) and desktop
#[cfg(all(feature = "tauri", not(feature = "desktop")))]
pub mod client;

pub use commands::*;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct P2PStatus {
    pub connected: bool,
    /// Desktop server: "1.2.3.4:7422". Mobile client: desktop endpoint it connected to.
    pub public_endpoint: Option<String>,
}
