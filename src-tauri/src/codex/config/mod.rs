pub mod mcp;
pub mod toml_helpers;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use self::mcp::McpServerConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodexConfig {
    #[serde(default)]
    pub mcp_servers: HashMap<String, McpServerConfig>,
}

pub fn get_config_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home_dir.join(".codex").join("config.toml"))
}
