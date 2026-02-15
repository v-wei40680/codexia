mod cc_commands;
mod codex;
mod codex_commands;
mod commands;
mod db;
mod dxt;
mod filesystem;
mod git;
mod sleep;
mod state;
mod web_server;
#[cfg(any(windows, target_os = "linux"))]
mod window;

use crate::state::WatchState;
use cc_commands::CCState;
use commands::terminal::TerminalState;
use filesystem::{
    directory_ops::{canonicalize_path, get_home_directory, read_directory, search_files},
    file_io::{delete_file, read_file, read_text_file_lines, write_file},
    file_parsers::{pdf::read_pdf_content, xlsx::read_xlsx_content},
    watch::{start_watch_directory, stop_watch_directory},
};
use sleep::{SleepState, allow_sleep, prevent_sleep};
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_log::Builder::new().build());
    #[cfg(any(windows, target_os = "linux"))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
        window::show_window(app, argv);
    }));

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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(CCState::new())
        .manage(WatchState::new())
        .manage(TerminalState::default())
        .manage(SleepState::default())
        .invoke_handler(tauri::generate_handler![
            codex::start_thread,
            codex::resume_thread,
            codex::list_threads,
            codex::list_archived_threads,
            codex::archive_thread,
            codex::turn_start,
            codex::turn_interrupt,
            codex::model_list,
            codex::account_rate_limits,
            codex::get_account,
            codex::login_account,
            codex::skills_list,
            codex::skills_config_write,
            codex::fuzzy_file_search,
            codex::start_review,
            codex::respond_to_command_execution_approval,
            codex::respond_to_file_change_approval,
            codex::respond_to_request_user_input,
            read_directory,
            get_home_directory,
            search_files,
            canonicalize_path,
            read_file,
            read_text_file_lines,
            write_file,
            delete_file,
            read_pdf_content,
            read_xlsx_content,
            start_watch_directory,
            stop_watch_directory,
            prevent_sleep,
            allow_sleep,
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
            // Unified MCP commands (routes to Codex or CC based on client_name)
            commands::mcp::unified_add_mcp_server,
            commands::mcp::unified_remove_mcp_server,
            commands::mcp::unified_enable_mcp_server,
            commands::mcp::unified_disable_mcp_server,
            commands::mcp::unified_read_mcp_config,
            commands::skills::clone_skills_repo,
            commands::skills::list_marketplace_skills,
            commands::skills::list_installed_skills,
            commands::skills::install_marketplace_skill,
            commands::skills::uninstall_installed_skill,
            commands::notes::create_note,
            commands::notes::get_notes,
            commands::notes::get_note_by_id,
            commands::notes::update_note,
            commands::notes::delete_note,
            commands::notes::toggle_favorite,
            commands::notes::mark_notes_synced,
            commands::notes::get_unsynced_notes,
            commands::git::git_status,
            commands::git::git_file_diff,
            commands::git::git_file_diff_meta,
            commands::git::git_diff_stats,
            commands::git::git_stage_files,
            commands::git::git_unstage_files,
            commands::git::git_prepare_thread_worktree,
            commands::terminal::terminal_start,
            commands::terminal::terminal_write,
            commands::terminal::terminal_resize,
            commands::terminal::terminal_stop,
            codex::utils::codex_home,
            commands::usage::read_token_usage,
            dxt::load_manifests,
            dxt::load_manifest,
            dxt::read_dxt_setting,
            dxt::save_dxt_setting,
            dxt::download_and_extract_manifests,
            dxt::check_manifests_exist,
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            let init_result = tauri::async_runtime::block_on(async {
                let event_sink: Arc<dyn codex::EventSink> =
                    Arc::new(codex::TauriEventSink::new(app_handle));
                let codex_client = codex::connect_codex(Arc::clone(&event_sink)).await?;
                codex::initialize_codex(&codex_client, Arc::clone(&event_sink)).await?;
                Ok::<_, String>((codex_client, event_sink))
            });

            let (codex_client, event_sink) = match init_result {
                Ok(value) => value,
                Err(err) => {
                    return Err(std::io::Error::other(err).into());
                }
            };
            app.handle().manage(codex::AppState {
                codex: codex_client,
            });
            codex::start_history_scanner(event_sink);

            #[cfg(debug_assertions)]
            {
                use std::process::Command;

                let status = Command::new("codex")
                    .args(["app-server", "generate-ts", "-o", "src/bindings"])
                    .current_dir(
                        std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                            .parent()
                            .expect("Failed to get project root"),
                    )
                    .status()
                    .expect("Failed to run codex app-server generate-ts");

                if !status.success() {
                    panic!("codex app-server generate-ts exited with non-zero status");
                }
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

pub fn start_web_server(port: u16) {
    tauri::async_runtime::block_on(async move {
        if let Err(err) = web_server::start_web_server(port).await {
            log::error!("Failed to start web server: {}", err);
        }
    });
}
