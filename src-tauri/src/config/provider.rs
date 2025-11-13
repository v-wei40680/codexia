use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use tauri::command;

use super::{get_config_path, CodexConfig};

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

    codex_config.model_providers.insert(provider_name, provider);

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
pub async fn delete_model_provider(provider_name: String) -> Result<(), String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Err("Config file not found.".to_string());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let mut codex_config: CodexConfig = toml::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    codex_config.model_providers.remove(&provider_name);

    // Remove profiles associated with the deleted model provider
    codex_config
        .profiles
        .retain(|_, profile| profile.model_provider != provider_name);

    let toml_content = toml::to_string(&codex_config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, toml_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

#[command]
pub async fn ensure_default_providers() -> Result<(), String> {
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

    let mut changed = false;

    if !codex_config.model_providers.contains_key("google") {
        codex_config.model_providers.insert(
            "google".to_string(),
            ModelProvider {
                name: "Google".to_string(),
                base_url: "https://generativelanguage.googleapis.com/v1beta/openai".to_string(),
                env_key: Some("GEMINI_API_KEY".to_string()),
            },
        );
        changed = true;
    }

    if !codex_config.model_providers.contains_key("openrouter") {
        codex_config.model_providers.insert(
            "openrouter".to_string(),
            ModelProvider {
                name: "OpenRouter".to_string(),
                base_url: "https://openrouter.ai/api/v1".to_string(),
                env_key: Some("OPENROUTER_API_KEY".to_string()),
            },
        );
        changed = true;
    }

    if changed {
        let toml_content = toml::to_string(&codex_config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }

        fs::write(&config_path, toml_content)
            .map_err(|e| format!("Failed to write config file: {}", e))?;
    }

    Ok(())
}
