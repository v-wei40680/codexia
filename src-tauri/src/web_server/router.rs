use axum::{
    Router,
    routing::{get, post},
};
use std::path::{Path, PathBuf};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};

use super::{
    handlers::{
        api_account_rate_limits, api_archive_thread, api_canonicalize_path,
        api_cc_connect, api_cc_disconnect, api_cc_get_installed_skills, api_cc_get_projects,
        api_cc_get_sessions, api_cc_get_settings, api_cc_interrupt, api_cc_list_sessions,
        api_cc_new_session, api_cc_resume_session, api_cc_send_message, api_cc_update_settings,
        api_check_manifests_exist, api_codex_home, api_create_note, api_delete_file,
        api_delete_note, api_download_and_extract_manifests, api_fuzzy_file_search,
        api_get_account, api_get_home_directory, api_get_note_by_id, api_get_notes,
        api_git_diff_stats, api_git_file_diff, api_git_file_diff_meta,
        api_git_prepare_thread_worktree, api_git_stage_files, api_git_status,
        api_git_unstage_files,
        api_list_archived_threads, api_list_threads, api_load_manifest, api_load_manifests,
        api_login_account, api_model_list, api_model_list_post, api_read_directory, api_read_file,
        api_read_pdf_content, api_read_text_file_lines, api_read_token_usage,
        api_read_xlsx_content, api_respond_command_execution_approval,
        api_respond_file_change_approval, api_respond_user_input, api_resume_thread,
        api_search_files, api_skills_config_write, api_skills_list, api_start_review,
        api_start_thread, api_start_watch_file, api_start_watch_path, api_stop_watch_file,
        api_stop_watch_path, api_terminal_resize, api_terminal_start, api_terminal_stop,
        api_terminal_write, api_toggle_favorite, api_turn_interrupt, api_turn_start,
        api_unified_add_mcp_server, api_unified_disable_mcp_server,
        api_unified_enable_mcp_server, api_unified_read_mcp_config,
        api_unified_remove_mcp_server, api_update_note, api_write_file, health_check,
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
        .route("/api/codex/skills/list", post(api_skills_list))
        .route(
            "/api/codex/skills/config/write",
            post(api_skills_config_write),
        )
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
        .route("/api/filesystem/read-directory", post(api_read_directory))
        .route("/api/filesystem/home-directory", get(api_get_home_directory))
        .route("/api/filesystem/canonicalize-path", post(api_canonicalize_path))
        .route("/api/filesystem/search-files", post(api_search_files))
        .route("/api/filesystem/codex-home", get(api_codex_home))
        .route("/api/filesystem/read-file", post(api_read_file))
        .route("/api/filesystem/read-text-file-lines", post(api_read_text_file_lines))
        .route("/api/filesystem/read-pdf", post(api_read_pdf_content))
        .route("/api/filesystem/read-xlsx", post(api_read_xlsx_content))
        .route("/api/filesystem/write-file", post(api_write_file))
        .route("/api/filesystem/delete-file", post(api_delete_file))
        .route("/api/filesystem/start-watch", post(api_start_watch_path))
        .route("/api/filesystem/stop-watch", post(api_stop_watch_path))
        .route("/api/filesystem/start-watch-file", post(api_start_watch_file))
        .route("/api/filesystem/stop-watch-file", post(api_stop_watch_file))
        .route("/api/terminal/start", post(api_terminal_start))
        .route("/api/terminal/write", post(api_terminal_write))
        .route("/api/terminal/resize", post(api_terminal_resize))
        .route("/api/terminal/stop", post(api_terminal_stop))
        .route("/api/notes/create", post(api_create_note))
        .route("/api/notes/list", post(api_get_notes))
        .route("/api/notes/get", post(api_get_note_by_id))
        .route("/api/notes/update", post(api_update_note))
        .route("/api/notes/delete", post(api_delete_note))
        .route("/api/notes/toggle-favorite", post(api_toggle_favorite))
        .route("/api/codex/mcp/read", post(api_unified_read_mcp_config))
        .route("/api/codex/mcp/add", post(api_unified_add_mcp_server))
        .route("/api/codex/mcp/remove", post(api_unified_remove_mcp_server))
        .route("/api/codex/mcp/enable", post(api_unified_enable_mcp_server))
        .route("/api/codex/mcp/disable", post(api_unified_disable_mcp_server))
        .route("/api/dxt/manifests", get(api_load_manifests))
        .route("/api/dxt/manifest", post(api_load_manifest))
        .route("/api/dxt/manifests/exist", get(api_check_manifests_exist))
        .route("/api/dxt/manifests/download", post(api_download_and_extract_manifests))
        .route(
            "/api/git/prepare-thread-worktree",
            post(api_git_prepare_thread_worktree),
        )
        .route("/api/git/status", post(api_git_status))
        .route("/api/git/file-diff", post(api_git_file_diff))
        .route("/api/git/file-diff-meta", post(api_git_file_diff_meta))
        .route("/api/git/diff-stats", post(api_git_diff_stats))
        .route("/api/git/stage-files", post(api_git_stage_files))
        .route("/api/git/unstage-files", post(api_git_unstage_files))
        .route("/api/codex/usage/token", get(api_read_token_usage))
        .route("/api/cc/connect", post(api_cc_connect))
        .route("/api/cc/send-message", post(api_cc_send_message))
        .route("/api/cc/disconnect", post(api_cc_disconnect))
        .route("/api/cc/new-session", post(api_cc_new_session))
        .route("/api/cc/interrupt", post(api_cc_interrupt))
        .route("/api/cc/list-sessions", get(api_cc_list_sessions))
        .route("/api/cc/resume-session", post(api_cc_resume_session))
        .route("/api/cc/projects", get(api_cc_get_projects))
        .route("/api/cc/installed-skills", get(api_cc_get_installed_skills))
        .route("/api/cc/settings", get(api_cc_get_settings).post(api_cc_update_settings))
        .route("/api/cc/sessions", get(api_cc_get_sessions))
        .fallback_service(static_site)
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state)
}
