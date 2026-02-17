use crate::cc::CCState;
use crate::commands::terminal::TerminalState;
use crate::features::sleep::SleepState;
use crate::state::WatchState;
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
        crate::window::show_window(app, argv);
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
            crate::codex::start_thread,
            crate::codex::resume_thread,
            crate::codex::list_threads,
            crate::codex::list_archived_threads,
            crate::codex::archive_thread,
            crate::codex::turn_start,
            crate::codex::turn_interrupt,
            crate::codex::model_list,
            crate::codex::account_rate_limits,
            crate::codex::get_account,
            crate::codex::login_account,
            crate::codex::skills_list,
            crate::codex::skills_config_write,
            crate::codex::fuzzy_file_search,
            crate::codex::start_review,
            crate::codex::respond_to_command_execution_approval,
            crate::codex::respond_to_file_change_approval,
            crate::codex::respond_to_request_user_input,
            crate::commands::filesystem::read_directory,
            crate::commands::filesystem::get_home_directory,
            crate::commands::filesystem::search_files,
            crate::commands::filesystem::canonicalize_path,
            crate::commands::filesystem::read_file,
            crate::commands::filesystem::read_text_file_lines,
            crate::commands::filesystem::write_file,
            crate::commands::filesystem::delete_file,
            crate::commands::filesystem::read_pdf_content,
            crate::commands::filesystem::read_xlsx_content,
            crate::commands::filesystem::start_watch_directory,
            crate::commands::filesystem::stop_watch_directory,
            crate::commands::filesystem::start_watch_file,
            crate::commands::filesystem::stop_watch_file,
            crate::commands::sleep::prevent_sleep,
            crate::commands::sleep::allow_sleep,
            // CC commands
            crate::cc::cc_connect,
            crate::cc::cc_new_session,
            crate::cc::cc_send_message,
            crate::cc::cc_disconnect,
            crate::cc::cc_interrupt,
            crate::cc::cc_list_sessions,
            crate::cc::cc_resume_session,
            crate::cc::cc_get_projects,
            crate::cc::cc_get_sessions,
            crate::cc::cc_get_installed_skills,
            crate::cc::cc_get_settings,
            crate::cc::cc_update_settings,
            // cc mcp
            crate::cc::cc_mcp_list,
            crate::cc::cc_mcp_get,
            crate::cc::cc_mcp_add,
            crate::cc::cc_mcp_remove,
            crate::cc::cc_list_projects,
            crate::cc::cc_mcp_disable,
            crate::cc::cc_mcp_enable,
            // Unified MCP commands (routes to Codex or CC based on client_name)
            crate::commands::mcp::unified_add_mcp_server,
            crate::commands::mcp::unified_remove_mcp_server,
            crate::commands::mcp::unified_enable_mcp_server,
            crate::commands::mcp::unified_disable_mcp_server,
            crate::commands::mcp::unified_read_mcp_config,
            crate::commands::skills::clone_skills_repo,
            crate::commands::skills::list_marketplace_skills,
            crate::commands::skills::list_installed_skills,
            crate::commands::skills::install_marketplace_skill,
            crate::commands::skills::uninstall_installed_skill,
            crate::commands::notes::create_note,
            crate::commands::notes::get_notes,
            crate::commands::notes::get_note_by_id,
            crate::commands::notes::update_note,
            crate::commands::notes::delete_note,
            crate::commands::notes::toggle_favorite,
            crate::commands::notes::mark_notes_synced,
            crate::commands::notes::get_unsynced_notes,
            crate::commands::git::git_status,
            crate::commands::git::git_file_diff,
            crate::commands::git::git_file_diff_meta,
            crate::commands::git::git_diff_stats,
            crate::commands::git::git_stage_files,
            crate::commands::git::git_unstage_files,
            crate::commands::git::git_prepare_thread_worktree,
            crate::commands::terminal::terminal_start,
            crate::commands::terminal::terminal_write,
            crate::commands::terminal::terminal_resize,
            crate::commands::terminal::terminal_stop,
            crate::codex::codex_home,
            crate::commands::usage::read_token_usage,
            crate::commands::dxt::load_manifests,
            crate::commands::dxt::load_manifest,
            crate::commands::dxt::read_dxt_setting,
            crate::commands::dxt::save_dxt_setting,
            crate::commands::dxt::download_and_extract_manifests,
            crate::commands::dxt::check_manifests_exist,
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            let event_sink: Arc<dyn crate::features::event_sink::EventSink> =
                Arc::new(crate::features::event_sink::TauriEventSink::new(app_handle));

            let init_result = tauri::async_runtime::block_on(async {
                let codex_client = crate::codex::connect_codex(Arc::clone(&event_sink)).await?;
                crate::codex::initialize_codex(&codex_client, Arc::clone(&event_sink)).await?;
                Ok::<_, String>(codex_client)
            });

            match init_result {
                Ok(codex_client) => {
                    app.handle().manage(crate::codex::AppState {
                        codex: codex_client,
                    });
                }
                Err(err) => {
                    log::warn!(
                        "codex app-server init failed, app will continue without codex backend: {}",
                        err
                    );
                }
            }

            crate::codex::scan::start_history_scanner(event_sink);

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
