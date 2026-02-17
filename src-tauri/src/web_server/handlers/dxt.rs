use super::to_error_response;
use axum::{Json, http::StatusCode};
use serde::Deserialize;
use serde_json::Value;
use crate::web_server::types::ErrorResponse;

use crate::features::dxt::{
    check_manifests_exist, download_and_extract_manifests, load_manifest, load_manifests,
    read_dxt_setting, save_dxt_setting,
};

#[derive(Deserialize)]
pub(crate) struct DxtManifestParams {
    user: String,
    repo: String,
}

#[derive(Deserialize)]
pub(crate) struct DxtSaveSettingParams {
    user: String,
    repo: String,
    content: Value,
}

pub(crate) async fn api_load_manifests() -> Result<Json<Value>, ErrorResponse> {
    let manifests = load_manifests().await.map_err(to_error_response)?;
    Ok(Json(manifests))
}

pub(crate) async fn api_load_manifest(
    Json(params): Json<DxtManifestParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let manifest = load_manifest(params.user, params.repo)
        .await
        .map_err(to_error_response)?;
    Ok(Json(manifest))
}

pub(crate) async fn api_check_manifests_exist() -> Result<Json<bool>, ErrorResponse> {
    let exists = check_manifests_exist().await.map_err(to_error_response)?;
    Ok(Json(exists))
}

pub(crate) async fn api_read_dxt_setting(
    Json(params): Json<DxtManifestParams>,
) -> Result<Json<Value>, ErrorResponse> {
    let setting = read_dxt_setting(params.user, params.repo)
        .await
        .map_err(to_error_response)?;
    Ok(Json(setting))
}

pub(crate) async fn api_save_dxt_setting(
    Json(params): Json<DxtSaveSettingParams>,
) -> Result<StatusCode, ErrorResponse> {
    save_dxt_setting(params.user, params.repo, params.content)
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}

pub(crate) async fn api_download_and_extract_manifests() -> Result<StatusCode, ErrorResponse> {
    download_and_extract_manifests()
        .await
        .map_err(to_error_response)?;
    Ok(StatusCode::OK)
}
