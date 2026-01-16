use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::str::FromStr;
use toml_edit::{Document, Item, Table};

use super::{get_config_path, CodexConfig};
use super::toml_helpers::{serialize_to_table, write_document_with_backup};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelProvider {
    pub name: String,
    pub base_url: String,
    pub env_key: Option<String>,
    pub requires_openai_auth: Option<bool>,
}

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

    let mut provider_table = serialize_to_table(&provider)?;

    // Preserve existing requires_openai_auth if not provided
    if provider.requires_openai_auth.is_none() {
        if let Some(existing_item) = providers_table.get(&provider_name) {
            if let Some(existing_table) = existing_item.as_table() {
                if let Some(existing_value) = existing_table.get("requires_openai_auth") {
                    provider_table.insert(
                        "requires_openai_auth",
                        existing_value.clone(),
                    );
                }
            }
        }
    }

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

pub async fn delete_model_provider(provider_name: String) -> Result<(), String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Err("Config file not found.".to_string());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let mut doc = Document::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    let doc_table = doc.as_table_mut();
    let mut provider_removed = false;

    if let Some(model_providers_table) = doc_table
        .get_mut("model_providers")
        .and_then(Item::as_table_mut)
    {
        provider_removed = model_providers_table.remove(&provider_name).is_some();
        if model_providers_table.is_empty() {
            doc_table.remove("model_providers");
        }
    }

    if !provider_removed {
        return Err(format!("Model provider '{}' not found", provider_name));
    }

    write_document_with_backup(&config_path, &doc)?;

    Ok(())
}
