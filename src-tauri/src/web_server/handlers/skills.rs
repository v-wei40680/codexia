use super::to_error_response;
use super::types::{
    SkillGroupsScopeParams, SkillGroupsWriteParams,
    SkillsCloneRepoParams, SkillsInstallParams, SkillsMarketplaceParams, SkillsUninstallParams,
};
use axum::Json;

use crate::features::skills::{self, InstalledSkill, MarketplaceSkill, SkillGroupsConfig};
use crate::web_server::types::ErrorResponse;

pub(crate) async fn api_skills_list_marketplace(
    _: Json<SkillsMarketplaceParams>,
) -> Result<Json<Vec<MarketplaceSkill>>, ErrorResponse> {
    let skills = skills::list_marketplace_skills()
        .await
        .map_err(to_error_response)?;
    Ok(Json(skills))
}

pub(crate) async fn api_skills_list_installed(
    Json(params): Json<SkillsMarketplaceParams>,
) -> Result<Json<Vec<InstalledSkill>>, ErrorResponse> {
    let skills = skills::list_installed_skills(params.selected_agent, params.scope, params.cwd)
        .await
        .map_err(to_error_response)?;
    Ok(Json(skills))
}

pub(crate) async fn api_skills_install_marketplace(
    Json(params): Json<SkillsInstallParams>,
) -> Result<Json<String>, ErrorResponse> {
    let result = skills::install_marketplace_skill(
        params.skill_md_path,
        params.skill_name,
        params.selected_agent,
        params.scope,
        params.cwd,
    )
    .await
    .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_skills_uninstall_installed(
    Json(params): Json<SkillsUninstallParams>,
) -> Result<Json<String>, ErrorResponse> {
    let result = skills::uninstall_installed_skill(
        params.skill_name,
        params.selected_agent,
        params.scope,
        params.cwd,
    )
    .await
    .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_skills_clone_repo(
    Json(params): Json<SkillsCloneRepoParams>,
) -> Result<Json<String>, ErrorResponse> {
    let result = skills::clone_skills_repo(params.url)
        .await
        .map_err(to_error_response)?;
    Ok(Json(result))
}

pub(crate) async fn api_skill_groups_read(
    Json(params): Json<SkillGroupsScopeParams>,
) -> Result<Json<SkillGroupsConfig>, ErrorResponse> {
    let config = skills::read_skill_groups(params.scope, params.cwd)
        .await
        .map_err(to_error_response)?;
    Ok(Json(config))
}

pub(crate) async fn api_skill_groups_write(
    Json(params): Json<SkillGroupsWriteParams>,
) -> Result<Json<()>, ErrorResponse> {
    skills::write_skill_groups(params.scope, params.cwd, params.config)
        .await
        .map_err(to_error_response)?;
    Ok(Json(()))
}
