mod codex_client;
mod commands;
mod config;
mod filesystem;
mod protocol;
mod state;

use commands::{
    approve_execution, check_codex_version, get_running_sessions, load_sessions_from_disk, send_message, start_codex_session, stop_session,
};
use config::{get_project_name, read_codex_config};
use filesystem::{
    calculate_file_tokens, get_default_directories, get_git_file_diff, read_csv_content,
    read_directory, read_file, read_pdf_content, read_xlsx_content, write_file,
};
use state::CodexState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(CodexState::new())
        .invoke_handler(tauri::generate_handler![
            start_codex_session,
            send_message,
            approve_execution,
            stop_session,
            get_running_sessions,
            load_sessions_from_disk,
            check_codex_version,
            read_directory,
            get_default_directories,
            calculate_file_tokens,
            read_file,
            write_file,
            read_pdf_content,
            read_csv_content,
            read_xlsx_content,
            get_git_file_diff,
            read_codex_config,
            get_project_name,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
