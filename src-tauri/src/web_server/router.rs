use axum::{
    Router,
    routing::{get, post},
};
use std::path::{Path, PathBuf};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};

use super::{
    handlers::{
        api_account_rate_limits, api_archive_thread, api_cancel_login_account,
        api_canonicalize_path, api_codex_home, api_create_note, api_delete_file, api_delete_note,
        api_fuzzy_file_search, api_get_account, api_get_home_directory, api_get_note_by_id,
        api_get_notes, api_list_archived_threads, api_list_threads, api_login_account,
        api_logout_account, api_model_list, api_model_list_post, api_read_directory, api_read_file,
        api_respond_command_execution_approval, api_respond_file_change_approval, api_search_files,
        api_respond_user_input, api_resume_thread, api_skills_list, api_start_review,
        api_start_thread, api_toggle_favorite, api_turn_interrupt, api_turn_start, api_update_note,
        api_write_file, health_check,
    },
    types::WebServerState,
    websocket::ws_handler,
};

fn resolve_dist_dir() -> PathBuf {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Some(project_root) = Path::new(env!("CARGO_MANIFEST_DIR")).parent() {
        candidates.push(project_root.join("dist"));
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("dist"));
            candidates.push(exe_dir.join("../dist"));
            candidates.push(exe_dir.join("../../dist"));
        }
    }

    candidates.push(PathBuf::from("dist"));

    candidates
        .into_iter()
        .find(|path| path.join("index.html").exists())
        .unwrap_or_else(|| PathBuf::from("dist"))
}

pub(crate) fn create_router(state: WebServerState) -> Router {
    let dist_dir = resolve_dist_dir();
    let static_site = ServeDir::new(dist_dir.clone())
        .not_found_service(ServeFile::new(dist_dir.join("index.html")));

    Router::new()
        .route("/health", get(health_check))
        .route("/ws", get(ws_handler))
        .route("/api/codex/thread/start", post(api_start_thread))
        .route("/api/codex/start-thread", post(api_start_thread))
        .route("/api/codex/thread/resume", post(api_resume_thread))
        .route("/api/codex/thread/list", post(api_list_threads))
        .route(
            "/api/codex/thread/list-archived",
            post(api_list_archived_threads),
        )
        .route("/api/codex/thread/archive", post(api_archive_thread))
        .route("/api/codex/turn/start", post(api_turn_start))
        .route("/api/codex/turn/interrupt", post(api_turn_interrupt))
        .route(
            "/api/codex/model/list",
            get(api_model_list).post(api_model_list_post),
        )
        .route(
            "/api/codex/account/rate-limits",
            get(api_account_rate_limits),
        )
        .route("/api/codex/account/get", post(api_get_account))
        .route("/api/codex/account/login", post(api_login_account))
        .route(
            "/api/codex/account/login/cancel",
            post(api_cancel_login_account),
        )
        .route("/api/codex/account/logout", post(api_logout_account))
        .route("/api/codex/skills/list", post(api_skills_list))
        .route(
            "/api/codex/approval/command-execution",
            post(api_respond_command_execution_approval),
        )
        .route(
            "/api/codex/approval/file-change",
            post(api_respond_file_change_approval),
        )
        .route(
            "/api/codex/approval/user-input",
            post(api_respond_user_input),
        )
        .route("/api/codex/search/fuzzy-file", post(api_fuzzy_file_search))
        .route("/api/codex/review/start", post(api_start_review))
        .route(
            "/api/codex/filesystem/read-directory",
            post(api_read_directory),
        )
        .route(
            "/api/codex/filesystem/home-directory",
            get(api_get_home_directory),
        )
        .route(
            "/api/codex/filesystem/canonicalize-path",
            post(api_canonicalize_path),
        )
        .route("/api/codex/filesystem/search-files", post(api_search_files))
        .route("/api/codex/filesystem/codex-home", get(api_codex_home))
        .route("/api/codex/filesystem/read-file", post(api_read_file))
        .route("/api/codex/filesystem/write-file", post(api_write_file))
        .route("/api/codex/filesystem/delete-file", post(api_delete_file))
        .route("/api/codex/notes/create", post(api_create_note))
        .route("/api/codex/notes/list", post(api_get_notes))
        .route("/api/codex/notes/get", post(api_get_note_by_id))
        .route("/api/codex/notes/update", post(api_update_note))
        .route("/api/codex/notes/delete", post(api_delete_note))
        .route(
            "/api/codex/notes/toggle-favorite",
            post(api_toggle_favorite),
        )
        .fallback_service(static_site)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state)
}
