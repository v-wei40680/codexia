pub fn start_server(host: &str, port: u16) {
    let host = host.to_string();
    let runtime = tokio::runtime::Runtime::new()
        .expect("Failed to create tokio runtime for web server startup");
    runtime.block_on(async move {
        if let Err(err) = crate::web_server::start_web_server(&host, port).await {
            log::error!("Failed to start web server: {}", err);
        }
    });
}
