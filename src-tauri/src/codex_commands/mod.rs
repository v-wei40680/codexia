//! Tauri command adapters for codex-client
//!
//! This module provides thin wrappers around codex-client functions,
//! adapting them to work with Tauri's command system.

pub mod state;
pub mod events;
pub mod check;
pub mod config;
pub mod mcp;
pub mod protocol;
pub mod session_files;

pub use state::CodexState;
pub use events::setup_event_bridge;

// Re-export all commands for tauri::generate_handler!
pub use config::project::*;
pub use config::provider::*;
pub use mcp::*;
pub use protocol::*;
pub use session_files::*;
