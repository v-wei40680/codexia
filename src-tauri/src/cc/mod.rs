#[cfg(feature = "tauri")]
pub mod commands;
pub mod db;
pub mod mcp;
pub mod scan;
pub mod services;
pub mod state;
pub mod types;

#[cfg(feature = "tauri")]
pub use commands::*;
pub use state::CCState;
pub use types::{AgentOptions, CCConnectParams, parse_permission_mode};
