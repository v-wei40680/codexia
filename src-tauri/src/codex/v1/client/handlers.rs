use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use codex_app_server_protocol::{
    ApplyPatchApprovalParams,
    CommandExecutionRequestApprovalParams,
    ExecCommandApprovalParams,
    FileChangeRequestApprovalParams,
    JSONRPCErrorError,
    JSONRPCNotification,
    JSONRPCRequest,
    RequestId,
    ServerNotification,
    ServerRequest,
};
use log::{debug, error, info, warn};
use serde::Serialize;
use serde_json::Value;
use tokio::process::ChildStdin;
use tokio::sync::Mutex;

use codex_protocol::ThreadId;

use crate::codex::v1::events::EventBus;
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

pub(super) async fn handle_notification(notification: JSONRPCNotification, event_bus: &EventBus) {
    if notification.method.starts_with("codex/event/") {
        debug!("Forwarding event notification {}", notification.method);
        let payload = NotificationPayload {
            method: notification.method,
            params: notification.params,
        };
        let payload_json = match serde_json::to_value(payload) {
            Ok(json) => json,
            Err(err) => {
                error!("Failed to serialize codex:event payload: {err}");
                return;
            }
        };
        event_bus.emit("codex:event", payload_json).await;
        return;
    }

    match ServerNotification::try_from(notification.clone()) {
        Ok(ServerNotification::AuthStatusChange(params)) => {
            info!("Auth status change notification: mode={:?}", params);
            let params_json = match serde_json::to_value(params) {
                Ok(json) => json,
                Err(err) => {
                    error!("Failed to serialize codex:auth-status payload: {err}");
                    return;
                }
            };
            event_bus.emit("codex:auth-status", params_json).await;
        }
        Ok(ServerNotification::LoginChatGptComplete(params)) => {
            info!(
                "Login completed notification: success={} id={}",
                params.success, params.login_id
            );
            let params_json = match serde_json::to_value(params) {
                Ok(json) => json,
                Err(err) => {
                    error!("Failed to serialize codex:login-complete payload: {err}");
                    return;
                }
            };
            event_bus.emit("codex:login-complete", params_json).await;
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
    event_bus: &EventBus,
    pending_server_requests: &PendingServerRequestMap,
) {
    match ServerRequest::try_from(request.clone()) {
        Ok(ServerRequest::ExecCommandApproval { request_id, params }) => {
            process_exec_command_request(request_id, params, event_bus, pending_server_requests).await;
        }
        Ok(ServerRequest::CommandExecutionRequestApproval { request_id, params }) => {
            let converted = convert_command_execution_request(params);
            process_exec_command_request(request_id, converted, event_bus, pending_server_requests).await;
        }
        Ok(ServerRequest::ApplyPatchApproval { request_id, params }) => {
            process_apply_patch_request(request_id, params, event_bus, pending_server_requests).await;
        }
        Ok(ServerRequest::FileChangeRequestApproval { request_id, params }) => {
            let converted = convert_file_change_request(params);
            process_apply_patch_request(request_id, converted, event_bus, pending_server_requests).await;
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

fn parse_conversation_id(thread_id: &str) -> ThreadId {
    match ThreadId::from_string(thread_id) {
        Ok(id) => id,
        Err(err) => {
            warn!(
                "Failed to parse conversation id from thread id {thread_id}: {err}"
            );
            ThreadId::default()
        }
    }
}

fn convert_command_execution_request(
    params: CommandExecutionRequestApprovalParams,
) -> ExecCommandApprovalParams {
    let CommandExecutionRequestApprovalParams {
        thread_id,
        item_id,
        reason,
        ..
    } = params;
    ExecCommandApprovalParams {
        conversation_id: parse_conversation_id(&thread_id),
        call_id: item_id,
        command: Vec::new(),
        cwd: PathBuf::new(),
        reason,
        parsed_cmd: Vec::new(),
    }
}

fn convert_file_change_request(params: FileChangeRequestApprovalParams) -> ApplyPatchApprovalParams {
    let FileChangeRequestApprovalParams {
        thread_id,
        item_id,
        reason,
        grant_root,
        ..
    } = params;
    ApplyPatchApprovalParams {
        conversation_id: parse_conversation_id(&thread_id),
        call_id: item_id,
        file_changes: HashMap::new(),
        reason,
        grant_root,
    }
}

async fn process_exec_command_request(
    request_id: RequestId,
    params: ExecCommandApprovalParams,
    event_bus: &EventBus,
    pending_server_requests: &PendingServerRequestMap,
) {
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
    let payload_json = match serde_json::to_value(payload) {
        Ok(json) => json,
        Err(err) => {
            error!("Failed to serialize exec command request payload: {err}");
            return;
        }
    };
    event_bus.emit("codex:exec-command-request", payload_json).await;
}

async fn process_apply_patch_request(
    request_id: RequestId,
    params: ApplyPatchApprovalParams,
    event_bus: &EventBus,
    pending_server_requests: &PendingServerRequestMap,
) {
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
    let payload_json = match serde_json::to_value(payload) {
        Ok(json) => json,
        Err(err) => {
            error!("Failed to serialize apply patch request payload: {err}");
            return;
        }
    };
    event_bus.emit("codex:apply-patch-request", payload_json).await;
}
