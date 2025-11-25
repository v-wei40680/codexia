use std::collections::HashMap;

use crate::config::provider as codex_provider;
use crate::config::provider::ModelProvider;

#[tauri::command]
pub async fn read_model_providers() -> Result<HashMap<String, ModelProvider>, String> {
    codex_provider::read_model_providers().await
}

#[tauri::command]
pub async fn add_or_update_model_provider(
    provider_name: String,
    provider: ModelProvider,
) -> Result<(), String> {
    codex_provider::add_or_update_model_provider(provider_name, provider).await
}

#[tauri::command]
pub async fn delete_model_provider(provider_name: String) -> Result<(), String> {
    codex_provider::delete_model_provider(provider_name).await
}
