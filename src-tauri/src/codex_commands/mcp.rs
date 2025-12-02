use std::collections::HashMap;
use codex_client::McpServerConfig;


#[tauri::command]
pub async fn read_mcp_servers(
) -> Result<HashMap<String, McpServerConfig>, String> {
    codex_client::mcp::read_mcp_servers().await
}

#[tauri::command]
pub async fn add_mcp_server(
    name: String,
    config: McpServerConfig,
) -> Result<(), String> {
    codex_client::mcp::add_mcp_server(name, config).await
}

#[tauri::command]
pub async fn delete_mcp_server(
    name: String,
) -> Result<(), String> {
    codex_client::mcp::delete_mcp_server(name).await
}

#[tauri::command]
pub async fn set_mcp_server_enabled(
    name: String,
    enabled: bool,
) -> Result<(), String> {
    codex_client::mcp::set_mcp_server_enabled(name, enabled).await
}
