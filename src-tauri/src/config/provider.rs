use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::str::FromStr;
use tauri::command;
use toml_edit::{Document, Item, Table};

use super::{get_config_path, CodexConfig};
use super::toml_helpers::serialize_to_table;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelProvider {
    pub name: String,
    pub base_url: String,
    pub env_key: Option<String>,
}

#[command]
pub async fn read_model_providers() -> Result<HashMap<String, ModelProvider>, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: CodexConfig = toml::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    Ok(config.model_providers)
}

#[command]
pub async fn add_or_update_model_provider(
    provider_name: String,
    provider: ModelProvider,
) -> Result<(), String> {
    let config_path = get_config_path()?;

    let mut doc = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config file: {}", e))?;
        Document::from_str(&content)
            .map_err(|e| format!("Failed to parse config file: {}", e))?
    } else {
        Document::new()
    };

    let providers_entry = doc
        .entry("model_providers")
        .or_insert(Item::Table(Table::new()));

    let providers_table = match providers_entry.as_table_mut() {
        Some(table) => table,
        None => {
            *providers_entry = Item::Table(Table::new());
            providers_entry
                .as_table_mut()
                .ok_or("Failed to access model_providers table")?
        }
    };

    let provider_table = serialize_to_table(&provider)?;
    providers_table.insert(&provider_name, Item::Table(provider_table));

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
pub async fn delete_model_provider(provider_name: String) -> Result<(), String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Err("Config file not found.".to_string());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let mut doc = Document::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    if let Some(model_providers_table) = doc
        .as_table_mut()
        .get_mut("model_providers")
        .and_then(Item::as_table_mut)
    {
        model_providers_table.remove(&provider_name);
    }

    if let Some(profiles_table) = doc
        .as_table_mut()
        .get_mut("profiles")
        .and_then(Item::as_table_mut)
    {
        let profile_names: Vec<String> = profiles_table
            .iter()
            .map(|(name, _)| name.to_string())
            .collect();
        let to_remove = {
            let mut names = Vec::new();
            for profile_name in profile_names {
                if let Some(profile_item) = profiles_table.get(&profile_name) {
                    if let Some(profile_table) = profile_item.as_table() {
                        if let Some(model_provider_item) = profile_table.get("model_provider") {
                            if let Some(value) = model_provider_item.as_value() {
                                if let Some(model_provider_str) = value.as_str() {
                                    if model_provider_str == provider_name {
                                        names.push(profile_name.clone());
                                    }
                                }
                            }
                        }
                    }
                }
            }
            names
        };
        for name in to_remove {
            profiles_table.remove(&name);
        }
    }

    let toml_content = doc.to_string();

    fs::write(&config_path, toml_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}