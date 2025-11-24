mod cmd;
mod commands;
mod filesystem;
mod services;
mod sleep;
mod state;

use filesystem::{
    directory_ops::{canonicalize_path, get_default_directories, read_directory, search_files},
    file_analysis::calculate_file_tokens,
    file_io::{read_file, write_file},
    file_parsers::{csv::read_csv_content, pdf::read_pdf_content, xlsx::read_xlsx_content},
    git_diff::get_git_file_diff,
    git_status::get_git_status,
    git_worktree::{
        prepare_git_worktree,
        git_commit_changes,
        apply_reverse_patch,
        commit_changes_to_worktree,
        delete_git_worktree,
    },
    watch::{start_watch_directory, stop_watch_directory},
};
use sleep::{allow_sleep, prevent_sleep, SleepState};
use state::{AppState, RemoteAccessState};
use tauri::{AppHandle, Emitter, Manager};

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
        .plugin(tauri_remote_ui::init())
        .plugin(tauri_plugin_screenshots::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .manage(RemoteAccessState::default())
        .manage(SleepState::default())
        .invoke_handler(tauri::generate_handler![
            commands::check::check_codex_version,
            commands::check::check_coder_version,
            state::get_client_name,
            state::set_client_name,
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
            commands::codex::read_codex_config,
            commands::codex::get_project_name,
            commands::codex::is_version_controlled,
            commands::codex::set_project_trust,
            commands::codex::read_mcp_servers,
            commands::codex::add_mcp_server,
            commands::codex::delete_mcp_server,
            commands::codex::set_mcp_server_enabled,
            commands::codex::read_model_providers,
            commands::codex::read_profiles,
            commands::codex::get_provider_config,
            commands::codex::get_profile_config,
            commands::codex::add_or_update_profile,
            commands::codex::delete_profile,
            commands::codex::add_or_update_model_provider,
            commands::codex::delete_model_provider,
            commands::remote::enable_remote_ui,
            commands::remote::disable_remote_ui,
            commands::remote::get_remote_ui_status,
            cmd::send_user_message,
            cmd::turn_start,
            cmd::new_conversation,
            cmd::resume_conversation,
            cmd::interrupt_conversation,
            cmd::respond_exec_command_request,
            cmd::respond_apply_patch_request,
            cmd::get_account,
            cmd::login_account_chatgpt,
            cmd::login_account_api_key,
            cmd::cancel_login_account,
            cmd::logout_account,
            cmd::add_conversation_listener,
            cmd::remove_conversation_listener,
            cmd::get_account_rate_limits,
            cmd::initialize_client,
            commands::file::delete_file,
            commands::env::set_system_env,
            commands::env::get_system_env,
            commands::codex::scan_projects,
            commands::codex::load_project_sessions,
            commands::codex::delete_session_file,
            commands::codex::update_cache_title,
            commands::terminal::open_terminal_with_command,
            commands::codex::delete_sessions_files,
            commands::codex::write_project_cache,
            commands::codex::update_project_favorites,
            commands::codex::remove_project_session,
            commands::codex::get_session_files,
            commands::codex::read_session_file,
            prevent_sleep,
            allow_sleep,
            commands::codex::read_token_usage,
        ])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            codex_bindings::export_ts_types();

            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                _app.deep_link().register_all()?;
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
            let _ = main_window.emit("deep-link-received", url);
        }
    }
}
