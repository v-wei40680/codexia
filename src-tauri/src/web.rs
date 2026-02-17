pub fn start_server(port: u16) {
    let runtime = tokio::runtime::Runtime::new()
        .expect("Failed to create tokio runtime for web server startup");
    runtime.block_on(async move {
        if let Err(err) = crate::web_server::start_web_server(port).await {
            log::error!("Failed to start web server: {}", err);
        }
    });
}
