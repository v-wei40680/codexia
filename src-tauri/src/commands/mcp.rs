use crate::features::mcp;
use serde_json::Value as JsonValue;

#[tauri::command]
pub async fn unified_add_mcp_server(
    client_name: String,
    path: Option<String>,
    server_name: String,
    server_config: JsonValue,
    scope: Option<String>,
) -> Result<(), String> {
    mcp::unified_add_mcp_server(client_name, path, server_name, server_config, scope).await
}

#[tauri::command]
pub async fn unified_enable_mcp_server(
    client_name: String,
    path: Option<String>,
    server_name: String,
) -> Result<(), String> {
    mcp::unified_enable_mcp_server(client_name, path, server_name).await
}

#[tauri::command]
pub async fn unified_disable_mcp_server(
    client_name: String,
    path: Option<String>,
    server_name: String,
) -> Result<(), String> {
    mcp::unified_disable_mcp_server(client_name, path, server_name).await
}

#[tauri::command]
pub async fn unified_remove_mcp_server(
    client_name: String,
    path: Option<String>,
    server_name: String,
    scope: Option<String>,
) -> Result<(), String> {
    mcp::unified_remove_mcp_server(client_name, path, server_name, scope).await
}

#[tauri::command]
pub async fn unified_read_mcp_config(
    client_name: String,
    path: Option<String>,
) -> Result<JsonValue, String> {
    mcp::unified_read_mcp_config(client_name, path).await
}
