use serde::{de::Deserializer, Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use tauri::command;

use crate::config::{get_config_path, CodexConfig};

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum McpServerConfig {
    #[serde(rename = "stdio")]
    Stdio {
        command: String,
        args: Vec<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        env: Option<HashMap<String, String>>,
    },
    #[serde(rename = "http")]
    Http { url: String },
    #[serde(rename = "sse")]
    Sse { url: String },
}

impl<'de> Deserialize<'de> for McpServerConfig {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        #[derive(Deserialize)]
        #[serde(tag = "type")]
        enum TaggedMcpServerConfig {
            #[serde(rename = "stdio")]
            Stdio {
                command: String,
                args: Vec<String>,
                #[serde(default)]
                env: Option<HashMap<String, String>>,
            },
            #[serde(rename = "http")]
            Http { url: String },
            #[serde(rename = "sse")]
            Sse { url: String },
        }

        #[derive(Deserialize)]
        struct LegacyStdioConfig {
            command: String,
            #[serde(default)]
            args: Vec<String>,
            #[serde(default)]
            env: Option<HashMap<String, String>>,
        }

        #[derive(Deserialize)]
        #[serde(untagged)]
        enum McpServerConfigHelper {
            Tagged(TaggedMcpServerConfig),
            Legacy(LegacyStdioConfig),
        }

        match McpServerConfigHelper::deserialize(deserializer)? {
            McpServerConfigHelper::Tagged(TaggedMcpServerConfig::Stdio {
                command,
                args,
                env,
            }) => Ok(McpServerConfig::Stdio { command, args, env }),
            McpServerConfigHelper::Tagged(TaggedMcpServerConfig::Http { url }) => {
                Ok(McpServerConfig::Http { url })
            }
            McpServerConfigHelper::Tagged(TaggedMcpServerConfig::Sse { url }) => {
                Ok(McpServerConfig::Sse { url })
            }
            McpServerConfigHelper::Legacy(LegacyStdioConfig { command, args, env }) => {
                Ok(McpServerConfig::Stdio { command, args, env })
            }
        }
    }
}

#[command]
pub async fn read_mcp_servers() -> Result<HashMap<String, McpServerConfig>, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: CodexConfig =
        toml::from_str(&content).map_err(|e| format!("Failed to parse config file: {}", e))?;

    Ok(config.mcp_servers)
}

#[command]
pub async fn add_mcp_server(name: String, config: McpServerConfig) -> Result<(), String> {
    let config_path = get_config_path()?;

    let mut codex_config: CodexConfig = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config file: {}", e))?;
        toml::from_str(&content).map_err(|e| format!("Failed to parse config file: {}", e))?
    } else {
        CodexConfig {
            projects: HashMap::new(),
            mcp_servers: HashMap::new(),
            model_providers: HashMap::new(),
            profiles: HashMap::new(),
        }
    };

    codex_config.mcp_servers.insert(name, config);

    let toml_content =
        toml::to_string(&codex_config).map_err(|e| format!("Failed to serialize config: {}", e))?;

    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    fs::write(&config_path, toml_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

#[command]
pub async fn delete_mcp_server(name: String) -> Result<(), String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Err("Config file does not exist".to_string());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let mut config: CodexConfig =
        toml::from_str(&content).map_err(|e| format!("Failed to parse config file: {}", e))?;

    if config.mcp_servers.remove(&name).is_none() {
        return Err(format!("MCP server '{}' not found", name));
    }

    let toml_content =
        toml::to_string(&config).map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, toml_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}
