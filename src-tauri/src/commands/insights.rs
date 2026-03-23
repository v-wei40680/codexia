use agent_insights::domain::HeatmapData;
use agent_insights::services::{AggregationService, CollectionService};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentHeatmaps {
    pub claude: Option<HeatmapData>,
    pub codex: Option<HeatmapData>,
    pub gemini: Option<HeatmapData>,
}

#[tauri::command]
pub async fn get_agent_heatmaps(since: Option<String>) -> Result<AgentHeatmaps, String> {
    let service = CollectionService::new().map_err(|e| e.to_string())?;
    let all_records = service.collect_all().await.map_err(|e| e.to_string())?;

    // Filter by date on this side — avoids needing the `cache` feature
    let records = if let Some(ref since_str) = since {
        if let Ok(cutoff) = NaiveDate::parse_from_str(since_str, "%Y-%m-%d") {
            all_records
                .into_iter()
                .filter(|r| r.created_at.date_naive() >= cutoff)
                .collect()
        } else {
            all_records
        }
    } else {
        all_records
    };

    let mut by_agent = AggregationService::aggregate_by_agent(records);

    Ok(AgentHeatmaps {
        claude: by_agent.remove("Claude"),
        codex: by_agent.remove("Codex"),
        gemini: by_agent.remove("Gemini"),
    })
}
