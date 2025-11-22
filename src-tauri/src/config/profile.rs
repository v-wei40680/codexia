use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::str::FromStr;
use tauri::command;
use toml_edit::{Document, Item, Table};

use super::{get_config_path, CodexConfig};
use super::provider::ModelProvider;
use super::toml_helpers::{serialize_to_table, write_document_with_backup};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub model_provider: String,
    pub model: Option<String>,
}

#[command]
pub async fn read_profiles() -> Result<HashMap<String, Profile>, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: CodexConfig = toml::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    Ok(config.profiles)
}

#[command]
pub async fn get_provider_config(
    provider_name: String,
) -> Result<Option<(ModelProvider, Option<Profile>)>, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: CodexConfig = toml::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    if let Some(provider) = config.model_providers.get(&provider_name) {
        let profile = config.profiles.get(&provider_name).cloned();
        Ok(Some((provider.clone(), profile)))
    } else {
        Ok(None)
    }
}

#[command]
pub async fn get_profile_config(profile_name: String) -> Result<Option<Profile>, String> {
    let profiles = read_profiles().await?;
    Ok(profiles.get(&profile_name).cloned())
}

#[command]
pub async fn add_or_update_profile(profile_name: String, profile: Profile) -> Result<(), String> {
    let config_path = get_config_path()?;

    let mut doc = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config file: {}", e))?;
        Document::from_str(&content)
            .map_err(|e| format!("Failed to parse config file: {}", e))?
    } else {
        Document::new()
    };

    let profiles_entry = doc
        .entry("profiles")
        .or_insert(Item::Table(Table::new()));

    let profiles_table = match profiles_entry.as_table_mut() {
        Some(table) => table,
        None => {
            *profiles_entry = Item::Table(Table::new());
            profiles_entry
                .as_table_mut()
                .ok_or("Failed to access profiles table")?
        }
    };

    let profile_table = serialize_to_table(&profile)?;
    profiles_table.insert(&profile_name, Item::Table(profile_table));

    write_document_with_backup(&config_path, &doc)?;

    Ok(())
}

#[command]
pub async fn delete_profile(profile_name: String) -> Result<(), String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Err("Config file does not exist".to_string());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let mut doc = Document::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    let table = doc
        .as_table_mut()
        .get_mut("profiles")
        .and_then(Item::as_table_mut)
        .ok_or(format!("Profile '{}' not found", profile_name))?;

    if table.remove(&profile_name).is_none() {
        return Err(format!("Profile '{}' not found", profile_name));
    }

    write_document_with_backup(&config_path, &doc)?;

    Ok(())
}
