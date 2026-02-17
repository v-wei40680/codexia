use crate::features::skills;

pub use skills::{InstalledSkill, MarketplaceSkill};

#[tauri::command]
pub async fn list_marketplace_skills(
    selected_agent: String,
    scope: String,
    cwd: Option<String>,
) -> Result<Vec<MarketplaceSkill>, String> {
    skills::list_marketplace_skills(selected_agent, scope, cwd).await
}

#[tauri::command]
pub async fn list_installed_skills(
    selected_agent: String,
    scope: String,
    cwd: Option<String>,
) -> Result<Vec<InstalledSkill>, String> {
    skills::list_installed_skills(selected_agent, scope, cwd).await
}

#[tauri::command]
pub async fn install_marketplace_skill(
    skill_md_path: String,
    skill_name: String,
    selected_agent: String,
    scope: String,
    cwd: Option<String>,
) -> Result<String, String> {
    skills::install_marketplace_skill(skill_md_path, skill_name, selected_agent, scope, cwd).await
}

#[tauri::command]
pub async fn uninstall_installed_skill(
    skill_name: String,
    selected_agent: String,
    scope: String,
    cwd: Option<String>,
) -> Result<String, String> {
    skills::uninstall_installed_skill(skill_name, selected_agent, scope, cwd).await
}

#[tauri::command]
pub async fn clone_skills_repo(url: String) -> Result<String, String> {
    skills::clone_skills_repo(url).await
}
