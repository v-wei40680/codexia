use serde_json::Value;

#[tauri::command]
pub async fn load_manifests() -> Result<Value, String> {
    codexia_shared::dxt::load_manifests().await
}

#[tauri::command]
pub async fn load_manifest(user: String, repo: String) -> Result<Value, String> {
    codexia_shared::dxt::load_manifest(user, repo).await
}

#[tauri::command]
pub async fn read_dxt_setting(user: String, repo: String) -> Result<Value, String> {
    codexia_shared::dxt::read_dxt_setting(user, repo).await
}

#[tauri::command]
pub async fn save_dxt_setting(user: String, repo: String, content: Value) -> Result<(), String> {
    codexia_shared::dxt::save_dxt_setting(user, repo, content).await
}

#[tauri::command]
pub async fn download_and_extract_manifests() -> Result<(), String> {
    codexia_shared::dxt::download_and_extract_manifests().await
}

#[tauri::command]
pub async fn check_manifests_exist() -> Result<bool, String> {
    codexia_shared::dxt::check_manifests_exist().await
}
