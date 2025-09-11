use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::command;

use crate::mcp::McpServerConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectConfig {
    pub trust_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelProvider {
    pub name: String,
    pub base_url: String,
    pub env_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub model_provider: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodexConfig {
    #[serde(default)]
    pub projects: HashMap<String, ProjectConfig>,
    #[serde(default)]
    pub mcp_servers: HashMap<String, McpServerConfig>,
    #[serde(default)]
    pub model_providers: HashMap<String, ModelProvider>,
    #[serde(default)]
    pub profiles: HashMap<String, Profile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub path: String,
    pub trust_level: String,
}

pub fn get_config_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home_dir.join(".codex").join("config.toml"))
}

#[command]
pub async fn read_codex_config() -> Result<Vec<Project>, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: CodexConfig =
        toml::from_str(&content).map_err(|e| format!("Failed to parse config file: {}", e))?;

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
pub async fn get_project_name(path: String) -> Result<String, String> {
    let path_buf = PathBuf::from(&path);
    let name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&path)
        .to_string();

    Ok(name)
}

#[command]
pub async fn read_model_providers() -> Result<HashMap<String, ModelProvider>, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: CodexConfig =
        toml::from_str(&content).map_err(|e| format!("Failed to parse config file: {}", e))?;

    Ok(config.model_providers)
}

#[command]
pub async fn read_profiles() -> Result<HashMap<String, Profile>, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: CodexConfig =
        toml::from_str(&content).map_err(|e| format!("Failed to parse config file: {}", e))?;

    Ok(config.profiles)
}

#[command]
pub async fn get_provider_config(
    provider_name: String,
) -> Result<Option<(ModelProvider, Option<Profile>)>, String> {
    let providers = read_model_providers().await?;
    let profiles = read_profiles().await?;

    if let Some(provider) = providers.get(&provider_name) {
        let profile = profiles.get(&provider_name).cloned();
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
pub async fn update_profile_model(profile_name: String, new_model: String) -> Result<(), String> {
    let config_path = get_config_path()?;

    let mut codex_config: CodexConfig = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config file: {}", e))?;
        toml::from_str(&content).map_err(|e| format!("Failed to parse config file: {}", e))?
    } else {
        return Err("Config file does not exist".to_string());
    };

    if let Some(profile) = codex_config.profiles.get_mut(&profile_name) {
        profile.model = new_model;
    } else {
        return Err(format!("Profile '{}' not found", profile_name));
    }

    let toml_content =
        toml::to_string(&codex_config).map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, toml_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
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
pub async fn delete_profile(profile_name: String) -> Result<(), String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Err("Config file does not exist".to_string());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let mut config: CodexConfig =
        toml::from_str(&content).map_err(|e| format!("Failed to parse config file: {}", e))?;

    if config.profiles.remove(&profile_name).is_none() {
        return Err(format!("Profile '{}' not found", profile_name));
    }

    let toml_content =
        toml::to_string(&config).map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, toml_content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
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
                env_key: "GEMINI_API_KEY".to_string(),
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
                env_key: "OPENROUTER_API_KEY".to_string(),
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
