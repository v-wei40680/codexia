use std::sync::Arc;

use codex_app_server_protocol::{
    ApplyPatchApprovalParams, ExecCommandApprovalParams, JSONRPCErrorError, JSONRPCNotification,
    JSONRPCRequest, RequestId, ServerNotification, ServerRequest,
};
use log::{debug, error, info, warn};
use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter};
use tokio::process::ChildStdin;
use tokio::sync::Mutex;

use super::transport::send_error;
use super::{PendingRequestKind, PendingServerRequest, PendingServerRequestMap};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NotificationPayload {
    method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<Value>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExecCommandApprovalNotification {
    request_token: String,
    params: ExecCommandApprovalParams,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ApplyPatchApprovalNotification {
    request_token: String,
    params: ApplyPatchApprovalParams,
}

pub(super) async fn handle_notification(notification: JSONRPCNotification, app: &AppHandle) {
    if notification.method.starts_with("codex/event/") {
        debug!("Forwarding event notification {}", notification.method);
        let payload = NotificationPayload {
            method: notification.method,
            params: notification.params,
        };
        if let Err(err) = app.emit("codex:event", payload) {
            error!("Failed to emit codex:event: {err}");
        }
        return;
    }

    match ServerNotification::try_from(notification.clone()) {
        Ok(ServerNotification::AuthStatusChange(params)) => {
            info!("Auth status change notification: mode={:?}", params);
            if let Err(err) = app.emit("codex:auth-status", params) {
                error!("Failed to emit codex:auth-status: {err}");
            }
        }
        Ok(ServerNotification::LoginChatGptComplete(params)) => {
            info!(
                "Login completed notification: success={} id={}",
                params.success, params.login_id
            );
            if let Err(err) = app.emit("codex:login-complete", params) {
                error!("Failed to emit codex:login-complete: {err}");
            }
        }
        Ok(_) => {
            debug!(
                "Unhandled server notification received from codex app-server: {}",
                notification.method
            );
        }
        Err(_) => {
            debug!(
                "Unknown notification received from codex app-server: {}",
                notification.method
            );
        }
    };
}

pub(super) async fn handle_server_request(
    request: JSONRPCRequest,
    stdin: &Arc<Mutex<ChildStdin>>,
    app: &AppHandle,
    pending_server_requests: &PendingServerRequestMap,
) {
    match ServerRequest::try_from(request.clone()) {
        Ok(ServerRequest::ExecCommandApproval { request_id, params }) => {
            info!(
                "Exec approval requested for conversation {} call {}",
                params.conversation_id, params.call_id
            );
            let token = request_id_key(&request_id);
            {
                let mut pending = pending_server_requests.lock().await;
                if pending
                    .insert(
                        token.clone(),
                        PendingServerRequest {
                            request_id: request_id.clone(),
                            kind: PendingRequestKind::ExecCommand,
                        },
                    )
                    .is_some()
                {
                    warn!(
                        "Overwriting pending exec command approval for token {}",
                        token
                    );
                }
            }
            let payload = ExecCommandApprovalNotification {
                request_token: token.clone(),
                params: params.clone(),
            };
            if let Err(err) = app.emit("codex:exec-command-request", payload) {
                error!("Failed to emit exec command request: {err}");
            }
        }
        Ok(ServerRequest::ApplyPatchApproval { request_id, params }) => {
            info!(
                "Patch approval requested for conversation {} files={}",
                params.conversation_id,
                params.file_changes.len()
            );
            let token = request_id_key(&request_id);
            {
                let mut pending = pending_server_requests.lock().await;
                if pending
                    .insert(
                        token.clone(),
                        PendingServerRequest {
                            request_id: request_id.clone(),
                            kind: PendingRequestKind::ApplyPatch,
                        },
                    )
                    .is_some()
                {
                    warn!(
                        "Overwriting pending apply patch approval for token {}",
                        token
                    );
                }
            }
            let payload = ApplyPatchApprovalNotification {
                request_token: token.clone(),
                params: params.clone(),
            };
            if let Err(err) = app.emit("codex:apply-patch-request", payload) {
                error!("Failed to emit apply patch request: {err}");
            }
        }
        Err(err) => {
            error!("Unsupported server request: {err}");
            let error = JSONRPCErrorError {
                code: -32601,
                message: "Unsupported request".to_string(),
                data: None,
            };
            if let Err(err) = send_error(stdin, request.id.clone(), error).await {
                error!("Failed to respond with error: {err}");
            }
        }
    }
}

fn request_id_key(id: &RequestId) -> String {
    match id {
        RequestId::String(value) => value.clone(),
        RequestId::Integer(value) => value.to_string(),
    }
}
