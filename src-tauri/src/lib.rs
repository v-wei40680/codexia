mod codex_client;
mod filesystem;
mod config;
mod protocol;
mod commands;
mod state;

use filesystem::{read_directory, get_default_directories, calculate_file_tokens, read_file, write_file, read_pdf_content, read_csv_content, read_xlsx_content, get_git_file_diff};
use config::{read_codex_config, get_project_name};
use commands::{start_codex_session, send_message, approve_execution, stop_session, get_running_sessions};
use state::CodexState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();
    
    tauri::Builder::default()
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
