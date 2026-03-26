use crate::features::skillssh::{self, MarketSkill};

#[tauri::command]
pub async fn fetch_market_leaderboard(board: String) -> Result<Vec<MarketSkill>, String> {
    skillssh::fetch_leaderboard(&board).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_market_skills(query: String, limit: u32) -> Result<Vec<MarketSkill>, String> {
    skillssh::search_skills(&query, limit as usize)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn install_from_market(
    source: String,
    skill_id: String,
    scope: String,
    cwd: Option<String>,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        skillssh::install_from_skillssh(&source, &skill_id, &scope, cwd.as_deref())
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Install task failed: {}", e))?
}
