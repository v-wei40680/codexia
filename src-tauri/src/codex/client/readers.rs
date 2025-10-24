use std::sync::Arc;

use codex_app_server_protocol::JSONRPCMessage;
use log::{debug, error, info, warn};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{ChildStderr, ChildStdin, ChildStdout};
use tokio::sync::Mutex;

use super::handlers::{handle_notification, handle_server_request};
use super::transport::{notify_pending_error, notify_pending_response};
use super::{PendingRequestMap, PendingServerRequestMap};

pub(super) fn spawn_stdout_reader(
    stdout: ChildStdout,
    pending_requests: PendingRequestMap,
    pending_server_requests: PendingServerRequestMap,
    stdin: Arc<Mutex<ChildStdin>>,
    app_handle: AppHandle,
) {
    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            debug!("codex app-server stdout: {trimmed}");

            match serde_json::from_str::<JSONRPCMessage>(trimmed) {
                Ok(JSONRPCMessage::Response(response)) => {
                    debug!("JSON-RPC response {:?}", response.id);
                    notify_pending_response(&pending_requests, response).await;
                }
                Ok(JSONRPCMessage::Error(error)) => {
                    warn!(
                        "JSON-RPC error for {:?}: code={} message={}",
                        error.id, error.error.code, error.error.message
                    );
                    notify_pending_error(&pending_requests, error).await;
                }
                Ok(JSONRPCMessage::Notification(notification)) => {
                    debug!("JSON-RPC notification {}", notification.method);
                    handle_notification(notification, &app_handle).await;
                }
                Ok(JSONRPCMessage::Request(request)) => {
                    info!("JSON-RPC request {}", request.method);
                    handle_server_request(
                        request,
                        &stdin,
                        &app_handle,
                        &pending_server_requests,
                    )
                    .await;
                }
                Err(err) => {
                    error!("Failed to parse JSON-RPC message: {err}. Payload: {trimmed}");
                }
            }
        }
        info!("codex app-server stdout closed");
    });
}

pub(super) fn spawn_stderr_reader(stderr: ChildStderr, app_handle: AppHandle) {
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                debug!("codex app-server stderr: {trimmed}");
            }
        }
        info!("codex app-server stderr closed; process exited");
        let _ = app_handle.emit("codex:process-exited", ());
    });
}
