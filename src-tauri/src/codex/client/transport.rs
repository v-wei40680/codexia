use std::sync::Arc;

use codex_app_server_protocol::{
    ApplyPatchApprovalResponse, ExecCommandApprovalResponse, JSONRPCError, JSONRPCErrorError,
    JSONRPCResponse, RequestId,
};
use codex_protocol::protocol::ReviewDecision;
use log::{debug, warn};
use serde::Serialize;
use serde_json::Value;
use tokio::io::AsyncWriteExt;
use tokio::process::ChildStdin;
use tokio::sync::Mutex;

use super::{PendingRequestKind, PendingRequestMap};

pub(super) async fn notify_pending_response(
    pending_requests: &PendingRequestMap,
    response: JSONRPCResponse,
) {
    debug!("Resolving pending response for id {:?}", response.id);
    let sender = {
        let mut pending = pending_requests.lock().await;
        pending.remove(&response.id)
    };
    if let Some(tx) = sender {
        let _ = tx.send(Ok(response.result));
    } else {
        warn!("No pending request found for {:?}", response.id);
    }
}

pub(super) async fn notify_pending_error(
    pending_requests: &PendingRequestMap,
    error: JSONRPCError,
) {
    warn!(
        "Resolving pending error for id {:?}: code={} message={}",
        error.id, error.error.code, error.error.message
    );
    let sender = {
        let mut pending = pending_requests.lock().await;
        pending.remove(&error.id)
    };
    if let Some(tx) = sender {
        let _ = tx.send(Err(error.error));
    } else {
        warn!("No pending request found for {:?}", error.id);
    }
}

pub(super) async fn respond_with_review_decision(
    stdin: &Arc<Mutex<ChildStdin>>,
    request_id: RequestId,
    kind: PendingRequestKind,
    decision: ReviewDecision,
) -> Result<(), String> {
    let value = match kind {
        PendingRequestKind::ExecCommand => {
            serde_json::to_value(ExecCommandApprovalResponse { decision })
        }
        PendingRequestKind::ApplyPatch => {
            serde_json::to_value(ApplyPatchApprovalResponse { decision })
        }
    }
    .map_err(|err| format!("Failed to serialize review decision: {err}"))?;

    send_response(stdin, request_id, value).await
}

pub(super) async fn send_response(
    stdin: &Arc<Mutex<ChildStdin>>,
    id: RequestId,
    result: Value,
) -> Result<(), String> {
    let response = JSONRPCResponse { id, result };
    write_message(stdin, &response).await
}

pub(super) async fn send_error(
    stdin: &Arc<Mutex<ChildStdin>>,
    id: RequestId,
    error: JSONRPCErrorError,
) -> Result<(), String> {
    let error = JSONRPCError { id, error };
    write_message(stdin, &error).await
}

pub(super) async fn write_message<T>(
    stdin: &Arc<Mutex<ChildStdin>>,
    message: &T,
) -> Result<(), String>
where
    T: Serialize,
{
    let mut json = serde_json::to_vec(message).map_err(|err| err.to_string())?;
    json.push(b'\n');
    let mut guard = stdin.lock().await;
    guard
        .write_all(&json)
        .await
        .map_err(|err| format!("Failed to write to codex app-server: {err}"))?;
    guard
        .flush()
        .await
        .map_err(|err| format!("Failed to flush codex app-server stdin: {err}"))
}
