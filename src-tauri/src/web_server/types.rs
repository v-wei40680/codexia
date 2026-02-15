use std::sync::Arc;

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use serde_json::Value;
use tokio::sync::broadcast;

use crate::cc_commands::CCState;
use crate::codex::AppState;
use crate::web_server::terminal::WebTerminalState;

#[derive(Clone)]
pub(crate) struct WebServerState {
    pub(crate) codex_state: Arc<AppState>,
    pub(crate) cc_state: Arc<CCState>,
    pub(crate) terminal_state: Arc<WebTerminalState>,
    pub(crate) event_tx: broadcast::Sender<(String, Value)>,
}

#[derive(Serialize)]
pub(super) struct ErrorResponse {
    pub(super) error: String,
}

impl IntoResponse for ErrorResponse {
    fn into_response(self) -> Response {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(self)).into_response()
    }
}
