pub(crate) mod filesystem_watch;
mod handlers;
mod router;
mod server;
pub(crate) mod terminal;
pub(crate) mod types;
mod websocket;

// web-only: standalone server that bootstraps its own codex connection
#[cfg(feature = "web")]
mod server_web;

pub use router::create_router;
pub use types::WebServerState;
#[cfg(feature = "web")]
pub use server_web::{start_web_server, start_web_server_with_events};
