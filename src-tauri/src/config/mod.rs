pub mod project;
pub mod provider;
pub mod profile;
pub mod toml_helpers;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use crate::mcp::McpServerConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodexConfig {
    #[serde(default)]
    pub projects: HashMap<String, project::ProjectConfig>,
    #[serde(default)]
    pub mcp_servers: HashMap<String, McpServerConfig>,
    #[serde(default)]
    pub model_providers: HashMap<String, provider::ModelProvider>,
    #[serde(default)]
    pub profiles: HashMap<String, profile::Profile>,
}

pub fn get_config_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home_dir.join(".codex").join("config.toml"))
}
