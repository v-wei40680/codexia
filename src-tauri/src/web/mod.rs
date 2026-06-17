pub(crate) mod watcher;
mod handlers;
mod router;
mod server;
pub(crate) mod terminal;
pub(crate) mod types;
mod websocket;

// web-only: standalone server that bootstraps its own codex connection
#[cfg(feature = "web")]
mod server_web;

#[cfg(feature = "tauri")]
pub use router::create_router;
#[cfg(feature = "tauri")]
pub use types::WebServerState;
#[cfg(feature = "web")]
pub use server_web::start_web_server;

#[cfg(feature = "web")]
pub fn start_server(host: &str, port: u16) {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    let host = host.to_string();

    // Open the browser after a short delay to let the server bind first.
    let open_url = format!("http://{}:{}", if host == "0.0.0.0" { "127.0.0.1" } else { &host }, port);
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(500));
        if let Err(e) = open::that(&open_url) {
            log::warn!("Failed to open browser: {}", e);
        } else {
            log::info!("Opened browser at {}", open_url);
        }
    });

    let runtime = tokio::runtime::Runtime::new()
        .expect("Failed to create tokio runtime for web server startup");
    runtime.block_on(async move {
        if let Err(err) = start_web_server(&host, port).await {
            log::error!("Failed to start web server: {}", err);
        }
    });
}
