/// Common app builder used by both desktop (gui.rs) and mobile entry points.
/// On mobile (iOS), the app is a thin WebView client that connects to the
/// desktop via a Cloudflare tunnel — no local plugins or commands needed.
pub fn build() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
}
