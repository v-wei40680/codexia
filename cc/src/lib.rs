pub mod claude_binary;
pub mod claude_discovery;
pub mod command_utils;
pub mod commands;
pub mod checkpoint;
pub mod process;
pub mod web_server;

// Re-export commonly used types and functions
pub use claude_discovery::discover_claude_command;
pub use checkpoint::manager::CheckpointManager;
