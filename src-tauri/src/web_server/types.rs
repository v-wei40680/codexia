use std::sync::Arc;

use axum::{
    extract::FromRef,
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use serde_json::Value;
use tokio::sync::broadcast;

use crate::cc::CCState;
use crate::codex::AppState;
use crate::sleep::SleepState;
use crate::web_server::filesystem_watch::WebWatchState;
use crate::web_server::terminal::WebTerminalState;

#[derive(Clone)]
pub(crate) struct WebServerState {
    pub(crate) codex_state: Arc<AppState>,
    pub(crate) cc_state: Arc<CCState>,
    pub(crate) sleep_state: Arc<SleepState>,
    pub(crate) terminal_state: Arc<WebTerminalState>,
    pub(crate) fs_watch_state: Arc<WebWatchState>,
    pub(crate) event_tx: broadcast::Sender<(String, Value)>,
}

impl FromRef<WebServerState> for broadcast::Sender<(String, Value)> {
    fn from_ref(state: &WebServerState) -> Self {
        state.event_tx.clone()
    }
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
