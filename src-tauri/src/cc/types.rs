use claude_agent_sdk_rs::types::mcp::{
    McpHttpServerConfig, McpServerConfig, McpServers, McpSseServerConfig, McpStdioServerConfig,
};
use claude_agent_sdk_rs::{ClaudeAgentOptions, PermissionMode};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CCConnectParams {
    pub session_id: String,
    pub cwd: String,
    pub model: Option<String>,
    pub permission_mode: Option<String>,
    pub resume_id: Option<String>,
}

/// MCP server configuration for serialization
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum McpServerConfigSerde {
    Stdio {
        command: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        args: Option<Vec<String>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        env: Option<HashMap<String, String>>,
    },
    Http {
        url: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        headers: Option<HashMap<String, String>>,
    },
    Sse {
        url: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        headers: Option<HashMap<String, String>>,
    },
}

impl From<McpServerConfigSerde> for McpServerConfig {
    fn from(config: McpServerConfigSerde) -> Self {
        match config {
            McpServerConfigSerde::Stdio { command, args, env } => {
                McpServerConfig::Stdio(McpStdioServerConfig { command, args, env })
            }
            McpServerConfigSerde::Http { url, headers } => {
                McpServerConfig::Http(McpHttpServerConfig { url, headers })
            }
            McpServerConfigSerde::Sse { url, headers } => {
                McpServerConfig::Sse(McpSseServerConfig { url, headers })
            }
        }
    }
}

/// Serializable options for ClaudeAgent
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AgentOptions {
    pub cwd: String,
    pub model: Option<String>,
    pub permission_mode: Option<String>,
    pub fallback_model: Option<String>,
    pub max_turns: Option<u32>,
    pub max_budget_usd: Option<f64>,
    pub max_thinking_tokens: Option<u32>,
    pub settings: Option<String>,
    pub allowed_tools: Option<Vec<String>>,
    pub disallowed_tools: Option<Vec<String>>,
    pub mcp_servers: Option<HashMap<String, McpServerConfigSerde>>,
}

impl AgentOptions {
    pub fn to_claude_options(&self, resume_id: Option<String>) -> ClaudeAgentOptions {
        use std::sync::Arc;

        let permission_mode = self
            .permission_mode
            .as_ref()
            .and_then(|m| parse_permission_mode(m));

        let plugins = vec![];

        // Convert MCP servers
        let mcp_servers = if let Some(servers) = &self.mcp_servers {
            let servers_map: HashMap<String, McpServerConfig> = servers
                .iter()
                .map(|(name, config)| (name.clone(), config.clone().into()))
                .collect();
            McpServers::Dict(servers_map)
        } else {
            McpServers::Empty
        };

        ClaudeAgentOptions {
            cwd: Some(PathBuf::from(&self.cwd)),
            model: self.model.clone(),
            fallback_model: self.fallback_model.clone(),
            max_turns: self.max_turns,
            max_budget_usd: self.max_budget_usd,
            max_thinking_tokens: self.max_thinking_tokens,
            settings: self.settings.clone(),
            permission_mode,
            allowed_tools: self.allowed_tools.clone().unwrap_or_default(),
            disallowed_tools: self.disallowed_tools.clone().unwrap_or_default(),
            plugins,
            mcp_servers,
            resume: resume_id,
            stderr_callback: Some(Arc::new(|msg| {
                log::error!("[CC STDERR] {}", msg);
            })),
            ..Default::default()
        }
    }
}

pub fn parse_permission_mode(mode: &str) -> Option<PermissionMode> {
    match mode {
        "default" => Some(PermissionMode::Default),
        "acceptEdits" => Some(PermissionMode::AcceptEdits),
        "plan" => Some(PermissionMode::Plan),
        "bypassPermissions" => Some(PermissionMode::BypassPermissions),
        _ => None,
    }
}
