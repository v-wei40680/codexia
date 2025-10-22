use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use tauri::command;

use super::{get_config_path, CodexConfig};
use super::provider::ModelProvider;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub model_provider: String,
    pub model: String,
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

    codex_config.profiles.insert(profile_name, profile);

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
pub async fn delete_profile(profile_name: String) -> Result<(), String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Err("Config file does not exist".to_string());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let mut config: CodexConfig = toml::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    if config.profiles.remove(&profile_name).is_none() {
        return Err(format!("Profile '{}' not found", profile_name));
    }

    let toml_content = toml::to_string(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, toml_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}
