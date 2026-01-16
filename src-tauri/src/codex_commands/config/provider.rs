use std::collections::HashMap;
use crate::codex::v1::ProviderConfig;
use crate::codex;


#[tauri::command]
pub async fn read_model_providers(
) -> Result<HashMap<String, ProviderConfig>, String> {
    codex::v1::config::provider::read_model_providers().await
}

#[tauri::command]
pub async fn add_or_update_model_provider(
    provider_name: String,
    provider: ProviderConfig,
) -> Result<(), String> {
    codex::v1::config::provider::add_or_update_model_provider(provider_name, provider).await
}

#[tauri::command]
pub async fn delete_model_provider(
    provider_name: String,
) -> Result<(), String> {
    codex::v1::config::provider::delete_model_provider(provider_name).await
}
