use super::db::update_session_preview;

pub async fn update_cache_title(
    project_path: String,
    session_path: String,
    preview: String,
) -> Result<(), String> {
    update_session_preview(&project_path, &session_path, &preview)
}
