use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::str::FromStr;
use tauri::command;
use toml_edit::{Document, Item, Table};

use super::{get_config_path, CodexConfig};
use super::toml_helpers::serialize_to_table;

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

    let mut doc = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config file: {}", e))?;
        Document::from_str(&content)
            .map_err(|e| format!("Failed to parse config file: {}", e))?
    } else {
        Document::new()
    };

    let projects_entry = doc
        .entry("projects")
        .or_insert(Item::Table(Table::new()));

    let projects_table = match projects_entry.as_table_mut() {
        Some(table) => table,
        None => {
            *projects_entry = Item::Table(Table::new());
            projects_entry
                .as_table_mut()
                .ok_or("Failed to access projects table")?
        }
    };

    let project_table = serialize_to_table(&ProjectConfig { trust_level })?;
    projects_table.insert(&path, Item::Table(project_table));

    let toml_content = doc.to_string();

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
