pub use codexia_shared::insights::{AgentHeatmaps, FilterOptions, Rankings};

#[tauri::command]
pub async fn get_agent_heatmaps(
    range: Option<String>,
    cwd: Option<String>,
    session_id: Option<String>,
    agent: Option<String>,
) -> Result<AgentHeatmaps, String> {
    codexia_shared::insights::get_agent_heatmaps(range, cwd, session_id, agent).await
}

#[tauri::command]
pub async fn get_insight_rankings(
    range: Option<String>,
    cwd: Option<String>,
    session_id: Option<String>,
    agent: Option<String>,
) -> Result<Rankings, String> {
    codexia_shared::insights::get_insight_rankings(range, cwd, session_id, agent).await
}

#[tauri::command]
pub async fn get_insight_filter_options() -> Result<FilterOptions, String> {
    codexia_shared::insights::get_insight_filter_options().await
}
