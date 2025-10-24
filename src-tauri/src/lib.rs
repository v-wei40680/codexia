mod cmd;
mod codex;
mod commands;
pub mod config;
mod export_bindings;
mod filesystem;
mod mcp;
mod services;
mod state;
mod utils;

use commands::{
    check_codex_version, create_new_window, disable_remote_ui,
    enable_remote_ui, get_remote_ui_status
};
use crate::config::provider::ensure_default_providers;


use filesystem::{
    directory_ops::{canonicalize_path, get_default_directories, read_directory, search_files},
    file_analysis::calculate_file_tokens,
    file_io::{read_file, write_file},
    file_parsers::{csv::read_csv_content, pdf::read_pdf_content, xlsx::read_xlsx_content},
    git_diff::get_git_file_diff,
    git_status::get_git_status,
    watch::{start_watch_directory, stop_watch_directory},
};
use mcp::{add_mcp_server, delete_mcp_server, read_mcp_servers};
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
        .invoke_handler(tauri::generate_handler![
            check_codex_version,
            create_new_window,
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
            start_watch_directory,
            stop_watch_directory,
            config::project::read_codex_config,
            config::project::get_project_name,
            config::project::is_version_controlled,
            config::project::set_project_trust,
            read_mcp_servers,
            add_mcp_server,
            delete_mcp_server,
            config::provider::read_model_providers,
            config::profile::read_profiles,
            config::profile::get_provider_config,
            config::profile::get_profile_config,
            config::profile::add_or_update_profile,
            config::profile::delete_profile,
            config::provider::add_or_update_model_provider,
            config::provider::ensure_default_providers,
            enable_remote_ui,
            disable_remote_ui,
            get_remote_ui_status,
            services::session::delete_session_file,
            cmd::send_user_message,
            cmd::new_conversation,
            cmd::respond_exec_command_request,
            cmd::delete_file,
        ])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            export_bindings::export_ts_types();

            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                _app.deep_link().register_all()?;
            }

            tauri::async_runtime::spawn(async {
                let _ = ensure_default_providers().await;
            });
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
