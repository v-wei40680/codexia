use codexia_codex;

#[tauri::command]
pub async fn get_env(key: String) -> Result<String, String> {
    codexia_codex::env::get_env(key).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_env(key: String, value: String) -> Result<(), String> {
    codexia_codex::env::set_env(key, value).map_err(|e| e.to_string())
}
