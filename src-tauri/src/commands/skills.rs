use crate::features::skills;

pub use skills::{CentralSkill, InstalledSkill, MarketplaceSkill, SkillGroupsConfig};

#[tauri::command]
pub async fn list_marketplace_skills() -> Result<Vec<MarketplaceSkill>, String> {
    skills::list_marketplace_skills().await
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
pub async fn list_central_skills(
    scope: String,
    cwd: Option<String>,
) -> Result<Vec<CentralSkill>, String> {
    skills::list_central_skills(scope, cwd).await
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
pub async fn link_skill_to_agent(
    skill_name: String,
    agent: String,
    scope: String,
    cwd: Option<String>,
) -> Result<(), String> {
    skills::link_skill_to_agent(skill_name, agent, scope, cwd).await
}

#[tauri::command]
pub async fn delete_central_skill(
    skill_name: String,
    scope: String,
    cwd: Option<String>,
) -> Result<(), String> {
    skills::delete_central_skill(skill_name, scope, cwd).await
}

#[tauri::command]
pub async fn clone_skills_repo(url: String) -> Result<String, String> {
    skills::clone_skills_repo(url).await
}

#[tauri::command]
pub async fn read_skill_groups() -> Result<SkillGroupsConfig, String> {
    skills::read_skill_groups().await
}

#[tauri::command]
pub async fn write_skill_groups(config: SkillGroupsConfig) -> Result<(), String> {
    skills::write_skill_groups(config).await
}
