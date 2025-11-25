use std::collections::HashMap;

use crate::config::profile as codex_profile;
use crate::config::provider::ModelProvider;
use crate::config::profile::Profile;

#[tauri::command]
pub async fn read_profiles() -> Result<HashMap<String, Profile>, String> {
    codex_profile::read_profiles().await
}

#[tauri::command]
pub async fn get_provider_config(
    provider_name: String,
) -> Result<Option<(ModelProvider, Option<Profile>)>, String> {
    codex_profile::get_provider_config(provider_name).await
}

#[tauri::command]
pub async fn get_profile_config(profile_name: String) -> Result<Option<Profile>, String> {
    codex_profile::get_profile_config(profile_name).await
}

#[tauri::command]
pub async fn add_or_update_profile(profile_name: String, profile: Profile) -> Result<(), String> {
    codex_profile::add_or_update_profile(profile_name, profile).await
}

#[tauri::command]
pub async fn delete_profile(profile_name: String) -> Result<(), String> {
    codex_profile::delete_profile(profile_name).await
}
