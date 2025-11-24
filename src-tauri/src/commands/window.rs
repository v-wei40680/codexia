use chrono::Utc;
use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub async fn create_new_window(app: AppHandle) -> Result<(), String> {
    let window_label = format!("main-{}", Utc::now().timestamp_millis());

    let window = WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::default())
        .title("Codexia")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .decorations(true)
        .resizable(true)
        .fullscreen(false)
        .build()
        .map_err(|e| format!("Failed to create new window: {}", e))?;

    window
        .set_focus()
        .map_err(|e| format!("Failed to focus window: {}", e))?;

    Ok(())
}
