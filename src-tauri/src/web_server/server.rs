use std::sync::Arc;

use serde_json::Value;
use tokio::sync::broadcast;

use super::{router::create_router, types::WebServerState};
use crate::cc_commands::CCState;
use crate::codex::scan::start_history_scanner;
use crate::codex::{AppState, EventSink, WebSocketEventSink, connect_codex, initialize_codex};
use crate::web_server::filesystem_watch::WebWatchState;

pub async fn start_web_server_with_events(
    codex_state: Arc<AppState>,
    cc_state: Arc<CCState>,
    event_tx: broadcast::Sender<(String, Value)>,
    port: u16,
) -> Result<(), Box<dyn std::error::Error>> {
    let history_sink: Arc<dyn EventSink> = Arc::new(WebSocketEventSink::new(event_tx.clone()));
    start_history_scanner(history_sink);

    let state = WebServerState {
        codex_state,
        cc_state,
        terminal_state: Arc::new(super::terminal::WebTerminalState::default()),
        fs_watch_state: Arc::new(WebWatchState::default()),
        event_tx,
    };

    let app = create_router(state);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await?;

    println!("Web server listening on http://0.0.0.0:{}", port);

    axum::serve(listener, app).await?;

    Ok(())
}

pub async fn start_web_server(port: u16) -> Result<(), Box<dyn std::error::Error>> {
    let (event_tx, _) = broadcast::channel(100);
    let event_sink: Arc<dyn EventSink> = Arc::new(WebSocketEventSink::new(event_tx.clone()));

    let codex = connect_codex(Arc::clone(&event_sink))
        .await
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    initialize_codex(&codex, Arc::clone(&event_sink))
        .await
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

    let codex_state = Arc::new(AppState { codex });
    let cc_state = Arc::new(CCState::new());
    start_web_server_with_events(codex_state, cc_state, event_tx, port).await
}
