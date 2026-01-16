//! Transport layer abstraction for codex-client
//!
//! This module provides an abstraction over different transport mechanisms
//! for communicating with the codex app-server process.

pub mod stdio;

use anyhow::Result;
use async_trait::async_trait;
use codex_app_server_protocol::JSONRPCMessage;
use std::net::SocketAddr;

/// Transport trait - abstracts the communication layer
///
/// This trait allows codex-client to work with different transport mechanisms:
/// - Stdio: for local subprocess communication (high performance)
/// - WebSocket: for remote access (iOS apps, remote clients)
#[async_trait]
pub trait Transport: Send + Sync {
    /// Send a JSON-RPC message
    async fn send(&self, message: JSONRPCMessage) -> Result<()>;

    /// Receive a JSON-RPC message
    async fn recv(&self) -> Result<JSONRPCMessage>;

    /// Check if the transport is still connected
    fn is_connected(&self) -> bool;
}

/// Transport configuration
#[derive(Debug, Clone)]
pub struct TransportConfig {
    pub transport_type: TransportType,
}

/// Transport type selection
#[derive(Debug, Clone)]
pub enum TransportType {
    /// Standard input/output communication with subprocess
    Stdio,

    /// WebSocket communication (for Phase 3)
    WebSocket { addr: SocketAddr },
}

impl Default for TransportConfig {
    fn default() -> Self {
        Self {
            transport_type: TransportType::Stdio,
        }
    }
}
