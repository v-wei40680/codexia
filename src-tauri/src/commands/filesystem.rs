use crate::features::filesystem::{
    directory_ops, file_io,
    file_parsers::{pdf, xlsx},
    file_types::FileEntry,
    watch,
};
use crate::state::WatchState;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    directory_ops::read_directory(path).await
}

#[tauri::command]
pub async fn get_home_directory() -> Result<String, String> {
    directory_ops::get_home_directory().await
}

#[tauri::command]
pub async fn search_files(
    root: String,
    query: String,
    exclude_folders: Vec<String>,
    max_results: Option<usize>,
) -> Result<Vec<FileEntry>, String> {
    directory_ops::search_files(root, query, exclude_folders, max_results).await
}

#[tauri::command]
pub async fn canonicalize_path(path: String) -> Result<String, String> {
    directory_ops::canonicalize_path(path).await
}

#[tauri::command]
pub async fn read_file(file_path: String) -> Result<String, String> {
    file_io::read_file(file_path).await
}

#[tauri::command]
pub async fn read_text_file_lines(file_path: String) -> Result<Vec<String>, String> {
    file_io::read_text_file_lines(file_path).await
}

#[tauri::command]
pub async fn write_file(file_path: String, content: String) -> Result<(), String> {
    file_io::write_file(file_path, content).await
}

#[tauri::command]
pub async fn delete_file(file_path: String) -> Result<(), String> {
    file_io::delete_file(file_path).await
}

#[tauri::command]
pub async fn read_pdf_content(file_path: String) -> Result<String, String> {
    pdf::read_pdf_content(file_path).await
}

#[tauri::command]
pub async fn read_xlsx_content(file_path: String) -> Result<String, String> {
    xlsx::read_xlsx_content(file_path).await
}

fn tauri_watch_emitter(app: AppHandle) -> Arc<dyn Fn(watch::FsChangePayload) + Send + Sync> {
    Arc::new(move |payload: watch::FsChangePayload| {
        let _ = app.emit("fs_change", &payload);
    })
}

#[tauri::command]
pub async fn start_watch_directory(
    app: AppHandle,
    state: State<'_, WatchState>,
    folder_path: String,
) -> Result<(), String> {
    watch::start_watch_directory(state.inner(), folder_path, tauri_watch_emitter(app)).await
}

#[tauri::command]
pub async fn stop_watch_directory(
    state: State<'_, WatchState>,
    folder_path: String,
) -> Result<(), String> {
    watch::stop_watch_directory(state.inner(), folder_path).await
}

#[tauri::command]
pub async fn start_watch_file(
    app: AppHandle,
    state: State<'_, WatchState>,
    file_path: String,
) -> Result<(), String> {
    watch::start_watch_file(state.inner(), file_path, tauri_watch_emitter(app)).await
}

#[tauri::command]
pub async fn stop_watch_file(
    state: State<'_, WatchState>,
    file_path: String,
) -> Result<(), String> {
    watch::stop_watch_file(state.inner(), file_path).await
}
