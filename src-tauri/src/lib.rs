mod app_state;
mod app_types;
mod cc_commands;
mod codex_commands;
mod commands;
mod config;
mod database;
mod dxt;
mod error;
mod filesystem;
mod services;
mod sleep;
mod state;
mod window;

use crate::state::{RemoteAccessState, WatchState};
use cc_commands::CCState;
use codex_commands::CodexState;
use filesystem::{
    directory_ops::{canonicalize_path, get_default_directories, read_directory, search_files},
    file_analysis::calculate_file_tokens,
    file_io::{read_file, read_text_file_lines, write_file},
    file_parsers::{csv::read_csv_content, pdf::read_pdf_content, xlsx::read_xlsx_content},
    git_diff::get_git_file_diff,
    git_status::get_git_status,
    git_worktree::{
        apply_reverse_patch, commit_changes_to_worktree, delete_git_worktree, git_commit_changes,
        prepare_git_worktree,
    },
    watch::{start_watch_directory, stop_watch_directory},
};
use sleep::{allow_sleep, prevent_sleep, SleepState};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::new().build());
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            window::show_window(app, argv);
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_screenshots::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_remote_ui::init())
        .manage(CodexState::new())
        .manage(CCState::new())
        .manage(RemoteAccessState::default())
        .manage(WatchState::new())
        .manage(SleepState::default())
        .invoke_handler(tauri::generate_handler![
            // Codexia native commands
            codex_commands::check::check_codex_version,
            codex_commands::check::check_coder_version,
            codex_commands::check::get_client_name,
            codex_commands::check::set_client_name,
            commands::window::create_new_window,
            read_directory,
            get_default_directories,
            search_files,
            canonicalize_path,
            calculate_file_tokens,
            read_file,
            read_text_file_lines,
            write_file,
            read_pdf_content,
            read_csv_content,
            read_xlsx_content,
            get_git_file_diff,
            get_git_status,
            prepare_git_worktree,
            git_commit_changes,
            apply_reverse_patch,
            delete_git_worktree,
            commit_changes_to_worktree,
            start_watch_directory,
            stop_watch_directory,
            codex_commands::read_codex_config,
            codex_commands::get_project_name,
            codex_commands::is_version_controlled,
            codex_commands::set_project_trust,
            codex_commands::read_mcp_servers,
            codex_commands::add_mcp_server,
            codex_commands::delete_mcp_server,
            codex_commands::set_mcp_server_enabled,
            codex_commands::read_model_providers,
            codex_commands::read_profiles,
            codex_commands::get_provider_config,
            codex_commands::get_profile_config,
            codex_commands::add_or_update_profile,
            codex_commands::delete_profile,
            codex_commands::add_or_update_model_provider,
            codex_commands::delete_model_provider,
            commands::remote::enable_remote_ui,
            commands::remote::disable_remote_ui,
            commands::remote::get_remote_ui_status,
            codex_commands::send_user_message,
            codex_commands::turn_start,
            codex_commands::new_conversation,
            codex_commands::resume_conversation,
            codex_commands::interrupt_conversation,
            codex_commands::respond_exec_command_request,
            codex_commands::respond_apply_patch_request,
            codex_commands::get_account,
            codex_commands::login_account_chatgpt,
            codex_commands::login_account_api_key,
            codex_commands::cancel_login_account,
            codex_commands::logout_account,
            codex_commands::add_conversation_listener,
            codex_commands::remove_conversation_listener,
            codex_commands::get_account_rate_limits,
            codex_commands::initialize_client,
            commands::file::delete_file,
            commands::env::set_system_env,
            commands::env::get_system_env,
            codex_commands::scan_projects,
            codex_commands::scanned_projects::get_scanned_projects,
            codex_commands::scanned_projects::scan_and_cache_projects,
            codex_commands::load_project_sessions,
            codex_commands::update_cache_title,
            commands::terminal::open_terminal_with_command,
            codex_commands::update_project_favorites,
            codex_commands::remove_project_session,
            prevent_sleep,
            allow_sleep,
            codex_commands::read_token_usage,
            // Note commands
            codex_commands::create_note,
            codex_commands::get_notes,
            codex_commands::get_note_by_id,
            codex_commands::update_note,
            codex_commands::delete_note,
            codex_commands::toggle_note_favorite,
            codex_commands::mark_notes_synced,
            codex_commands::get_unsynced_notes,
            // Skills commands
            commands::skill::get_skills,
            commands::skill::get_skills_for_app,
            commands::skill::install_skill,
            commands::skill::install_skill_for_app,
            commands::skill::uninstall_skill,
            commands::skill::uninstall_skill_for_app,
            commands::skill::get_skill_repos,
            commands::skill::add_skill_repo,
            commands::skill::remove_skill_repo,
            // CC commands
            cc_commands::cc_connect,
            cc_commands::cc_new_session,
            cc_commands::cc_send_message,
            cc_commands::cc_disconnect,
            cc_commands::cc_interrupt,
            cc_commands::cc_list_sessions,
            cc_commands::cc_resume_session,
            cc_commands::cc_get_projects,
            cc_commands::cc_get_sessions,
            cc_commands::cc_get_installed_skills,
            cc_commands::cc_get_settings,
            cc_commands::cc_update_settings,

            // cc mcp
            cc_commands::cc_mcp_list,
            cc_commands::cc_mcp_get,
            cc_commands::cc_mcp_add,
            cc_commands::cc_mcp_remove,
            cc_commands::cc_list_projects,
            cc_commands::cc_mcp_disable,
            cc_commands::cc_mcp_enable,

            dxt::load_manifests,
            dxt::load_manifest,
            dxt::read_dxt_setting,
            dxt::save_dxt_setting,
            dxt::download_and_extract_manifests,
            dxt::check_manifests_exist,
            
            // Unified MCP commands (routes to Codex or CC based on client_name)
            commands::mcp::unified_add_mcp_server,
            commands::mcp::unified_remove_mcp_server,
            commands::mcp::unified_enable_mcp_server,
            commands::mcp::unified_disable_mcp_server,
            commands::mcp::unified_read_mcp_config,
        ])
        .setup(|app| {
            // Initialize Skills database
            let db = database::Database::init()
                .expect("Failed to initialize skills database");
            let db_arc = std::sync::Arc::new(db);

            // Initialize default skill repositories
            if let Err(e) = db_arc.init_default_skill_repos() {
                log::warn!("Failed to initialize default skill repos: {}", e);
            }

            app.manage(app_state::AppState::new(db_arc));

            // Setup event bridge between codex-client and Tauri
            let codex_state = app.state::<CodexState>();
            codex_commands::setup_event_bridge(
                app.handle().clone(),
                codex_state.client_state.clone(),
            );

            #[cfg(debug_assertions)]
            {
                use std::path::Path;
                let out = Path::new(env!("CARGO_MANIFEST_DIR"))
                    .join("..")
                    .join("src")
                    .join("bindings");

                codex_bindings::export_ts_types(Some(out));
            }

            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
