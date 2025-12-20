mod codex_commands;
mod commands;
mod filesystem;
mod services;
mod sleep;
mod state;

use crate::state::{RemoteAccessState, WatchState};
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
use tauri::{AppHandle, Manager};
use tauri_remote_ui::EmitterExt;

// Import CC types for database and process management
#[cfg(feature = "cc-support")]
use cc::commands::agents::{init_database, AgentDb};
#[cfg(feature = "cc-support")]
use cc::checkpoint::state::CheckpointState;
#[cfg(feature = "cc-support")]
use cc::process::ProcessRegistryState;
#[cfg(feature = "cc-support")]
use cc::commands::claude::ClaudeProcessState;
#[cfg(feature = "cc-support")]
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::new().build());
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            show_window(app, argv);
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            // CC (opcode) commands
            #[cfg(feature = "cc-support")]
            cc::commands::claude::list_projects,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::create_project,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::get_project_sessions,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::get_home_directory,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::get_claude_settings,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::open_new_session,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::get_system_prompt,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::check_claude_version,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::save_system_prompt,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::save_claude_settings,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::find_claude_md_files,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::read_claude_md_file,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::save_claude_md_file,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::load_session_history,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::execute_claude_code,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::continue_claude_code,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::resume_claude_code,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::cancel_claude_execution,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::list_running_claude_sessions,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::get_claude_session_output,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::list_directory_contents,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::search_files,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::get_recently_modified_files,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::get_hooks_config,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::update_hooks_config,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::validate_hook_command,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::create_checkpoint,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::restore_checkpoint,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::list_checkpoints,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::fork_from_checkpoint,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::get_session_timeline,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::update_checkpoint_settings,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::get_checkpoint_diff,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::track_checkpoint_message,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::track_session_messages,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::check_auto_checkpoint,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::cleanup_old_checkpoints,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::get_checkpoint_settings,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::clear_checkpoint_manager,
            #[cfg(feature = "cc-support")]
            cc::commands::claude::get_checkpoint_state_stats,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::list_agents,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::create_agent,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::update_agent,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::delete_agent,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::get_agent,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::execute_agent,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::list_agent_runs,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::get_agent_run,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::list_agent_runs_with_metrics,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::get_agent_run_with_real_time_metrics,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::list_running_sessions,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::kill_agent_session,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::get_session_status,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::cleanup_finished_processes,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::get_session_output,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::get_live_session_output,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::stream_session_output,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::load_agent_session_history,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::get_claude_binary_path,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::set_claude_binary_path,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::list_claude_installations,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::export_agent,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::export_agent_to_file,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::import_agent,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::import_agent_from_file,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::fetch_github_agents,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::fetch_github_agent_content,
            #[cfg(feature = "cc-support")]
            cc::commands::agents::import_agent_from_github,
            #[cfg(feature = "cc-support")]
            cc::commands::usage::get_usage_stats,
            #[cfg(feature = "cc-support")]
            cc::commands::usage::get_usage_by_date_range,
            #[cfg(feature = "cc-support")]
            cc::commands::usage::get_usage_details,
            #[cfg(feature = "cc-support")]
            cc::commands::usage::get_session_stats,
            #[cfg(feature = "cc-support")]
            cc::commands::mcp::mcp_add,
            #[cfg(feature = "cc-support")]
            cc::commands::mcp::mcp_list,
            #[cfg(feature = "cc-support")]
            cc::commands::mcp::mcp_get,
            #[cfg(feature = "cc-support")]
            cc::commands::mcp::mcp_remove,
            #[cfg(feature = "cc-support")]
            cc::commands::mcp::mcp_add_json,
            #[cfg(feature = "cc-support")]
            cc::commands::mcp::mcp_add_from_claude_desktop,
            #[cfg(feature = "cc-support")]
            cc::commands::mcp::mcp_serve,
            #[cfg(feature = "cc-support")]
            cc::commands::mcp::mcp_test_connection,
            #[cfg(feature = "cc-support")]
            cc::commands::mcp::mcp_reset_project_choices,
            #[cfg(feature = "cc-support")]
            cc::commands::mcp::mcp_get_server_status,
            #[cfg(feature = "cc-support")]
            cc::commands::mcp::mcp_read_project_config,
            #[cfg(feature = "cc-support")]
            cc::commands::mcp::mcp_save_project_config,
            #[cfg(feature = "cc-support")]
            cc::commands::storage::storage_list_tables,
            #[cfg(feature = "cc-support")]
            cc::commands::storage::storage_read_table,
            #[cfg(feature = "cc-support")]
            cc::commands::storage::storage_update_row,
            #[cfg(feature = "cc-support")]
            cc::commands::storage::storage_delete_row,
            #[cfg(feature = "cc-support")]
            cc::commands::storage::storage_insert_row,
            #[cfg(feature = "cc-support")]
            cc::commands::storage::storage_execute_sql,
            #[cfg(feature = "cc-support")]
            cc::commands::storage::storage_reset_database,
            #[cfg(feature = "cc-support")]
            cc::commands::slash_commands::slash_commands_list,
            #[cfg(feature = "cc-support")]
            cc::commands::slash_commands::slash_command_get,
            #[cfg(feature = "cc-support")]
            cc::commands::slash_commands::slash_command_save,
            #[cfg(feature = "cc-support")]
            cc::commands::slash_commands::slash_command_delete,
            #[cfg(feature = "cc-support")]
            cc::commands::proxy::get_proxy_settings,
            #[cfg(feature = "cc-support")]
            cc::commands::proxy::save_proxy_settings,
        ])
        .setup(|app| {
            #[cfg(feature = "cc-support")]
            {
                // Initialize CC agents database for storage commands
                let conn = init_database(&app.handle())
                    .expect("Failed to initialize agents database");
                app.manage(AgentDb(Mutex::new(conn)));

                // Initialize checkpoint state for checkpoint commands
                app.manage(CheckpointState::new());

                // Initialize process registry for agent process management
                app.manage(ProcessRegistryState::default());

                // Initialize Claude process state
                app.manage(ClaudeProcessState::default());
            }

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

fn show_window(app: &AppHandle, args: Vec<String>) {
    let windows = app.webview_windows();
    let main_window = windows.values().next().expect("Sorry, no window found");

    main_window
        .set_focus()
        .expect("Can't Bring Window to Focus");

    dbg!(args.clone());
    if args.len() > 1 {
        let url = args[1].clone();

        dbg!(url.clone());
        if url.starts_with("codexia://") {
            let _ = EmitterExt::emit(main_window, "deep-link-received", url);
        }
    }
}
