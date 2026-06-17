// Core modules — requires the "core" feature (shared by "desktop" and "web")
#[cfg(desktop)]
mod env;
#[cfg(feature = "core")]
mod cc;
#[cfg(feature = "core")]
mod codex;
#[cfg(feature = "core")]
mod db;
#[cfg(feature = "core")]
mod shared;
#[cfg(all(feature = "core", feature = "tauri"))]
mod state;
#[cfg(all(feature = "core", feature = "tauri"))]
mod commands;
#[cfg(feature = "tauri")]
pub mod p2p;
// web_server compiles for the standalone web binary AND the desktop Tauri app
// (the latter uses it for in-process P2P routing without opening a port).
#[cfg(feature = "web")]
pub mod web;
#[cfg(all(feature = "core", feature = "tauri", not(feature = "web")))]
mod web;
#[cfg(all(feature = "core", feature = "tauri", any(windows, target_os = "linux")))]
mod window;
#[cfg(all(feature = "core", feature = "tauri", target_os = "macos"))]
mod menu;

#[cfg(feature = "tauri")]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Mobile: thin WebView client that connects to the desktop via Quinn P2P tunnel.
    #[cfg(not(desktop))]
    {
        // rustls 0.23+ has no built-in default crypto provider; install ring explicitly.
        // Without this, Tauri's internal tauri:// URL scheme handler (which uses reqwest+rustls)
        // panics on the first asset request, causing an immediate app crash on iOS.
        let _ = rustls::crypto::ring::default_provider().install_default();

        std::panic::set_hook(Box::new(|info| {
            eprintln!("[iOS PANIC] {info}");
        }));
    }

    #[cfg(not(feature = "desktop"))]
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            p2p::p2p_stun,
            p2p::p2p_connect,
            p2p::p2p_disconnect,
            p2p::p2p_set_stun_servers,
        ]);

    // Desktop: full app with all plugins, commands, and setup.
    #[cfg(feature = "desktop")]
    let builder = {
        use cc::CCState;
        use crate::shared::terminal::TerminalState;
        use crate::shared::sleep::SleepState;
        use crate::state::WatchState;
        use std::sync::Arc;
        use std::time::Instant;
        use tauri::Manager;

        let builder = tauri::Builder::default()
            .plugin(tauri_plugin_os::init())
            .plugin(tauri_plugin_deep_link::init())
            .plugin(
                tauri_plugin_log::Builder::new()
                    .level(log::LevelFilter::Info)
                    .build(),
            )
            .plugin(tauri_plugin_fs::init())
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_screenshots::init())
            .plugin(tauri_plugin_updater::Builder::new().build());

        #[cfg(any(windows, target_os = "linux"))]
        let builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            crate::window::show_window(app, argv);
        }));

        #[cfg(target_os = "macos")]
        let builder = builder
            .menu(|app| {
                crate::menu::build_menu(app)
            })
            .on_menu_event(|app, event| {
                crate::menu::on_menu_event(app, &event)
            });

        builder
            .manage(WatchState::new())
            .manage(TerminalState::default())
            .manage(SleepState::default())
            .invoke_handler(tauri::generate_handler![
                codex::list_other_models,
                codex::load_env_keys,
                codex::start_thread,
                codex::resume_thread,
                codex::fork_thread,
                codex::rollback_thread,
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
                codex::start_review,
                codex::respond_to_command_execution_approval,
                codex::respond_to_file_change_approval,
                codex::respond_to_request_user_input,
                codex::initialize_codex_async,
                commands::fs::read_directory,
                commands::fs::get_home_directory,
                commands::fs::search_files,
                commands::fs::search_files_by_name,
                commands::fs::canonicalize_path,
                commands::fs::read_file,
                commands::fs::read_text_file_lines,
                commands::fs::write_file,
                commands::fs::delete_file,
                commands::fs::read_pdf_content,
                commands::fs::read_xlsx_content,
                commands::fs::watch_directory,
                commands::fs::unwatch_directory,
                commands::sleep::prevent_sleep,
                commands::sleep::allow_sleep,
                cc::cc_connect,
                cc::cc_new_session,
                cc::cc_send_message,
                cc::cc_disconnect,
                cc::cc_interrupt,
                cc::cc_resume_session,
                cc::cc_list_sessions,
                cc::cc_delete_session,
                cc::cc_get_session_messages,
                cc::cc_get_installed_skills,
                cc::cc_get_slash_commands,
                cc::cc_get_settings,
                cc::cc_update_settings,
                cc::cc_resolve_permission,
                cc::cc_set_permission_mode,
                cc::cc_mcp_list,
                cc::cc_mcp_get,
                cc::cc_mcp_add,
                cc::cc_mcp_remove,
                cc::cc_list_projects,
                cc::cc_mcp_disable,
                cc::cc_mcp_enable,
                commands::mcp::unified_add_mcp_server,
                commands::mcp::unified_remove_mcp_server,
                commands::mcp::unified_enable_mcp_server,
                commands::mcp::unified_disable_mcp_server,
                commands::mcp::unified_read_mcp_config,
                commands::skillssh::fetch_market_leaderboard,
                commands::skillssh::search_market_skills,
                commands::skillssh::install_from_market,
                commands::skills::clone_skills_repo,
                commands::skills::list_marketplace_skills,
                commands::skills::list_installed_skills,
                commands::skills::list_central_skills,
                commands::skills::install_marketplace_skill,
                commands::skills::uninstall_installed_skill,
                commands::skills::link_skill_to_agent,
                commands::skills::delete_central_skill,
                commands::skills::read_skill_groups,
                commands::skills::write_skill_groups,
                commands::notes::create_note,
                commands::notes::get_notes,
                commands::notes::get_note_by_id,
                commands::notes::update_note,
                commands::notes::delete_note,
                commands::notes::toggle_favorite,
                commands::notes::mark_notes_synced,
                commands::notes::get_unsynced_notes,
                commands::automation::list_automations,
                commands::automation::list_automation_runs,
                commands::automation::create_automation,
                commands::automation::update_automation,
                commands::automation::set_automation_paused,
                commands::automation::delete_automation,
                commands::automation::run_automation_now,
                commands::git::git_branch_info,
                commands::git::git_list_branches,
                commands::git::git_create_branch,
                commands::git::git_checkout_branch,
                commands::git::git_status,
                commands::git::git_file_diff,
                commands::git::git_file_diff_meta,
                commands::git::git_diff_stats,
                commands::git::git_stage_files,
                commands::git::git_unstage_files,
                commands::git::git_reverse_files,
                commands::git::git_create_worktree,
                commands::git::git_remove_worktree,
                commands::git::git_apply_worktree_changes,
                commands::git::git_has_worktree_changes,
                commands::git::git_commit,
                commands::git::git_push,
                commands::terminal::terminal_start,
                commands::terminal::terminal_write,
                commands::terminal::terminal_resize,
                commands::terminal::terminal_stop,
                codex::codex_home,
                commands::insights::get_agent_heatmaps,
                commands::insights::get_insight_filter_options,
                commands::insights::get_insight_rankings,
                commands::dxt::load_manifests,
                commands::dxt::load_manifest,
                commands::dxt::read_dxt_setting,
                commands::dxt::save_dxt_setting,
                commands::dxt::download_and_extract_manifests,
                commands::dxt::check_manifests_exist,
                p2p::p2p_start,
                p2p::p2p_stop,
                p2p::p2p_status_cmd,
                p2p::p2p_stun,
                p2p::p2p_connect,
                p2p::p2p_disconnect,
                p2p::p2p_set_stun_servers,
                quit_app,
                env::get_env,
                env::set_env,
            ])
            .setup(|app| {
                let app_handle = app.handle().clone();
                let event_sink: Arc<dyn crate::shared::event_sink::EventSink> =
                    Arc::new(crate::shared::event_sink::TauriEventSink::new(app_handle));

                app.manage(CCState::new(Arc::clone(&event_sink)));

                let codex_init_started_at = Instant::now();
                let init_result = tauri::async_runtime::block_on(async {
                    let connect_started_at = Instant::now();
                    let codex_client = codex::connect_codex(Arc::clone(&event_sink)).await?;
                    log::info!(
                        "codex startup timing: connect_codex finished in {:?}",
                        connect_started_at.elapsed()
                    );
                    Ok::<_, String>(codex_client)
                });

                match init_result {
                    Ok(codex_client) => {
                        log::info!(
                            "codex startup timing: total connect during setup took {:?}",
                            codex_init_started_at.elapsed()
                        );
                        let client_clone = codex_client.clone();
                        app.handle().manage(codex::AppState { codex: codex_client });
                        app.handle().manage(codex::CodexInitializationState::new(
                            Arc::clone(&event_sink),
                        ));
                        tauri::async_runtime::spawn(async move {
    if let Err(e) = codex::config::provider::write_model_providers(&*client_clone).await {
                        log::error!("Failed to write model provider configs: {}", e);
                    }
                });
                    }
                    Err(err) => {
                        log::warn!(
                            "codex app-server init failed after {:?}, app will continue without codex backend: {}",
                            codex_init_started_at.elapsed(),
                            err,
                        );
                    }
                }

                codex::scan::start_history_scanner(event_sink.clone());
                cc::scan::start_session_scanner();

                tauri::async_runtime::spawn(async {
                    tokio::task::spawn_blocking(codexia_git::scan_all_orphan_worktrees)
                        .await
                        .ok();
                });

                if let Some(main_window) = app.get_webview_window("main") {
                    let app_handle = app.handle().clone();
                    main_window.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                            api.prevent_close();
                            if let Some(w) = app_handle.get_webview_window("main") {
                                let _ = w.hide();
                            }
                        }
                    });
                }

                #[cfg(any(windows, target_os = "linux"))]
                {
                    use tauri_plugin_deep_link::DeepLinkExt;
                    app.deep_link().register_all()?;
                }

                Ok(())
            })
    };

    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {
            // macOS: clicking the Dock icon when the main window is hidden should show it.
            #[cfg(target_os = "macos")]
            {
            use tauri::Manager;
            if let tauri::RunEvent::Reopen { has_visible_windows, .. } = &_event {
                if !has_visible_windows {
                    if let Some(window) = _app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
            }
        });
}

#[cfg(all(feature = "tauri", feature = "core"))]
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}
