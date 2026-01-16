use std::collections::HashMap;
use crate::codex::v1::McpServerConfig;
use crate::codex;


#[tauri::command]
pub async fn read_mcp_servers(
) -> Result<HashMap<String, McpServerConfig>, String> {
    codex::v1::mcp::read_mcp_servers().await
}

#[tauri::command]
pub async fn add_mcp_server(
    name: String,
    config: McpServerConfig,
) -> Result<(), String> {
    codex::v1::mcp::add_mcp_server(name, config).await
}

#[tauri::command]
pub async fn delete_mcp_server(
    name: String,
) -> Result<(), String> {
    codex::v1::mcp::delete_mcp_server(name).await
}

#[tauri::command]
pub async fn set_mcp_server_enabled(
    name: String,
    enabled: bool,
) -> Result<(), String> {
    codex::v1::mcp::set_mcp_server_enabled(name, enabled).await
}
