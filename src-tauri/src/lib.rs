use std::path::Path;

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
    file_io::{read_file, write_file},
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_log::Builder::new().build());
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
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_screenshots::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_remote_ui::init())
        .manage(CodexState::new())
        .manage(RemoteAccessState::default())
        .manage(WatchState::new())
        .manage(SleepState::default())
        .invoke_handler(tauri::generate_handler![
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
            codex_commands::delete_session_file,
            codex_commands::update_cache_title,
            commands::terminal::open_terminal_with_command,
            codex_commands::delete_sessions_files,
            codex_commands::update_project_favorites,
            codex_commands::remove_project_session,
            codex_commands::get_session_files,
            codex_commands::read_session_file,
            prevent_sleep,
            allow_sleep,
            codex_commands::read_token_usage,
        ])
        .setup(|app| {
            // Setup event bridge between codex-client and Tauri
            let codex_state = app.state::<CodexState>();
            codex_commands::setup_event_bridge(
                app.handle().clone(),
                codex_state.client_state.clone(),
            );

            #[cfg(debug_assertions)]
            {
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
