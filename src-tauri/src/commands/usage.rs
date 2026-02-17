use crate::features::usage;
use serde_json::Value;

#[tauri::command]
pub async fn read_token_usage() -> Result<Vec<Value>, String> {
    usage::read_token_usage().await
}
