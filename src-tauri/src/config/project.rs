use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::command;

use super::{get_config_path, CodexConfig};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectConfig {
    pub trust_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub path: String,
    pub trust_level: String,
}

#[command]
pub async fn read_codex_config() -> Result<Vec<Project>, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: CodexConfig = toml::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    let projects: Vec<Project> = config
        .projects
        .into_iter()
        .map(|(path, project_config)| Project {
            path,
            trust_level: project_config.trust_level,
        })
        .collect();

    Ok(projects)
}

/// Check if a given path is a Git repository (version controlled).
#[command]
pub async fn is_version_controlled(path: String) -> Result<bool, String> {
    let path_buf = PathBuf::from(&path);
    let git_path = path_buf.join(".git");
    Ok(git_path.exists())
}

/// Set or update a project's trust level in `~/.codex/config.toml`.
#[command]
pub async fn set_project_trust(path: String, trust_level: String) -> Result<(), String> {
    let config_path = get_config_path()?;

    // Read existing config or initialize a default one
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

    codex_config
        .projects
        .insert(path, ProjectConfig { trust_level });

    let toml_content = toml::to_string(&codex_config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    fs::write(&config_path, toml_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

#[command]
pub async fn get_project_name(path: String) -> Result<String, String> {
    let path_buf = PathBuf::from(&path);
    let name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&path)
        .to_string();

    Ok(name)
}
