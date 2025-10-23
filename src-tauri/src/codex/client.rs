use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use std::sync::atomic::{AtomicI64, Ordering};

use codex_app_server_protocol::{
    AddConversationListenerParams, AddConversationSubscriptionResponse, ApplyPatchApprovalParams,
    ApplyPatchApprovalResponse, ClientInfo, ExecCommandApprovalParams, ExecCommandApprovalResponse,
    InitializeParams, JSONRPCError, JSONRPCErrorError, JSONRPCMessage, JSONRPCNotification,
    JSONRPCRequest, JSONRPCResponse, NewConversationParams, NewConversationResponse, RequestId,
    SendUserMessageParams, SendUserMessageResponse, ServerNotification, ServerRequest,
};
use codex_protocol::protocol::ReviewDecision;
use log::{debug, error, info, warn};
use serde::Serialize;
use serde::de::DeserializeOwned;
use serde_json::Value;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, ChildStdout, Command};
use tokio::sync::{Mutex, oneshot};

use crate::utils::codex_discovery::discover_codex_command;

type JsonRpcResult = Result<Value, JSONRPCErrorError>;
type PendingRequestMap = Arc<Mutex<HashMap<RequestId, oneshot::Sender<JsonRpcResult>>>>;
type PendingServerRequestMap = Arc<Mutex<HashMap<String, PendingServerRequest>>>;

#[derive(Clone)]
pub struct CodexAppServerClient {
    _child: Arc<Mutex<Child>>,
    stdin: Arc<Mutex<ChildStdin>>,
    pending_requests: PendingRequestMap,
    next_request_id: Arc<AtomicI64>,
    pending_server_requests: PendingServerRequestMap,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NotificationPayload {
    method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<Value>,
}

fn request_id_key(id: &RequestId) -> String {
    match id {
        RequestId::String(value) => value.clone(),
        RequestId::Integer(value) => value.to_string(),
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PendingRequestKind {
    ExecCommand,
    ApplyPatch,
}

#[derive(Clone)]
struct PendingServerRequest {
    request_id: RequestId,
    kind: PendingRequestKind,
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

impl CodexAppServerClient {
    pub async fn spawn(app_handle: AppHandle) -> Result<Arc<Self>, String> {
        let codex_path = discover_codex_command().ok_or_else(|| {
            "Unable to locate codex binary. Install Codex CLI or set CODEX_PATH.".to_string()
        })?;

        let mut command = Command::new(codex_path);
        command
            .arg("app-server")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        let mut child_process = command
            .spawn()
            .map_err(|err| format!("Failed to start codex app-server: {err}"))?;

        let stdin = child_process
            .stdin
            .take()
            .ok_or_else(|| "codex app-server missing stdin handle".to_string())?;
        let stdout = child_process
            .stdout
            .take()
            .ok_or_else(|| "codex app-server missing stdout handle".to_string())?;
        let stderr = child_process.stderr.take();

        let child = Arc::new(Mutex::new(child_process));
        let stdin = Arc::new(Mutex::new(stdin));
        let pending_requests: PendingRequestMap = Arc::new(Mutex::new(HashMap::new()));
        let pending_server_requests: PendingServerRequestMap = Arc::new(Mutex::new(HashMap::new()));
        let client = Arc::new(Self {
            _child: child.clone(),
            stdin: stdin.clone(),
            pending_requests: pending_requests.clone(),
            next_request_id: Arc::new(AtomicI64::new(1)),
            pending_server_requests: pending_server_requests.clone(),
        });

        spawn_stdout_reader(
            stdout,
            pending_requests,
            pending_server_requests,
            stdin.clone(),
            app_handle.clone(),
        );
        if let Some(stderr) = stderr {
            spawn_stderr_reader(stderr, app_handle.clone());
        }

        client.initialize().await?;
        Ok(client)
    }

    async fn initialize(&self) -> Result<(), String> {
        let params = InitializeParams {
            client_info: ClientInfo {
                name: "codexia-zen".to_string(),
                title: Some("Codexia Zen".to_string()),
                version: env!("CARGO_PKG_VERSION").to_string(),
            },
        };
        let params_value = serde_json::to_value(params).map_err(|err| err.to_string())?;
        self.request::<Value>("initialize", Some(params_value))
            .await?;
        self.send_notification("initialized", None).await
    }

    pub async fn new_conversation(
        &self,
        params: NewConversationParams,
    ) -> Result<NewConversationResponse, String> {
        let params_value = serde_json::to_value(params).map_err(|err| err.to_string())?;
        self.request("newConversation", Some(params_value)).await
    }

    pub async fn add_conversation_listener(
        &self,
        params: AddConversationListenerParams,
    ) -> Result<AddConversationSubscriptionResponse, String> {
        let params_value = serde_json::to_value(params).map_err(|err| err.to_string())?;
        self.request("addConversationListener", Some(params_value))
            .await
    }

    pub async fn send_user_message(
        &self,
        params: SendUserMessageParams,
    ) -> Result<SendUserMessageResponse, String> {
        let params_value = serde_json::to_value(params).map_err(|err| err.to_string())?;
        self.request("sendUserMessage", Some(params_value)).await
    }

    pub async fn respond_exec_command_request(
        &self,
        request_token: &str,
        decision: ReviewDecision,
    ) -> Result<(), String> {
        self.respond_pending_request(request_token, PendingRequestKind::ExecCommand, decision)
            .await
    }

    async fn send_notification(&self, method: &str, params: Option<Value>) -> Result<(), String> {
        let notification = JSONRPCNotification {
            method: method.to_string(),
            params,
        };
        write_message(&self.stdin, &notification).await
    }

    async fn request<T>(&self, method: &str, params: Option<Value>) -> Result<T, String>
    where
        T: DeserializeOwned,
    {
        let result = self.send_request(method, params).await?;
        serde_json::from_value(result).map_err(|err| err.to_string())
    }

    async fn send_request(&self, method: &str, params: Option<Value>) -> Result<Value, String> {
        let request_id = RequestId::Integer(self.next_request_id.fetch_add(1, Ordering::Relaxed));
        let request = JSONRPCRequest {
            id: request_id.clone(),
            method: method.to_string(),
            params,
        };

        let (tx, rx) = oneshot::channel::<JsonRpcResult>();
        {
            let mut pending = self.pending_requests.lock().await;
            pending.insert(request_id.clone(), tx);
        }

        if let Err(err) = write_message(&self.stdin, &request).await {
            let mut pending = self.pending_requests.lock().await;
            pending.remove(&request_id);
            return Err(err);
        }

        match rx.await {
            Ok(Ok(value)) => Ok(value),
            Ok(Err(json_error)) => Err(format!(
                "codex app-server error {}: {}",
                json_error.code, json_error.message
            )),
            Err(_) => Err("codex app-server channel closed".to_string()),
        }
    }

    async fn respond_pending_request(
        &self,
        request_token: &str,
        expected_kind: PendingRequestKind,
        decision: ReviewDecision,
    ) -> Result<(), String> {
        let pending = {
            let mut guard = self.pending_server_requests.lock().await;
            guard.remove(request_token)
        }
        .ok_or_else(|| format!("Unknown approval request: {request_token}"))?;

        if pending.kind != expected_kind {
            let mut guard = self.pending_server_requests.lock().await;
            guard.insert(request_token.to_string(), pending.clone());
            return Err(format!(
                "Approval request {request_token} has unexpected kind"
            ));
        }

        respond_with_review_decision(&self.stdin, pending.request_id, pending.kind, decision).await
    }
}

fn spawn_stdout_reader(
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
                    handle_server_request(request, &stdin, &app_handle, &pending_server_requests)
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

fn spawn_stderr_reader(stderr: tokio::process::ChildStderr, app_handle: AppHandle) {
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

async fn notify_pending_response(pending_requests: &PendingRequestMap, response: JSONRPCResponse) {
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

async fn notify_pending_error(pending_requests: &PendingRequestMap, error: JSONRPCError) {
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

async fn handle_notification(notification: JSONRPCNotification, app: &AppHandle) {
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

async fn handle_server_request(
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
            let payload = ApplyPatchApprovalNotification {
                request_token: request_id_key(&request_id),
                params: params.clone(),
            };
            if let Err(err) = app.emit("codex:apply-patch-request", payload) {
                error!("Failed to emit apply patch request: {err}");
            }
            if let Err(err) = respond_with_review_decision(
                stdin,
                request_id,
                PendingRequestKind::ApplyPatch,
                ReviewDecision::Denied,
            )
            .await
            {
                error!("Failed to auto-deny patch approval request: {err}");
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

async fn respond_with_review_decision(
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

async fn send_response(
    stdin: &Arc<Mutex<ChildStdin>>,
    id: RequestId,
    result: Value,
) -> Result<(), String> {
    let response = JSONRPCResponse { id, result };
    write_message(stdin, &response).await
}

async fn send_error(
    stdin: &Arc<Mutex<ChildStdin>>,
    id: RequestId,
    error: JSONRPCErrorError,
) -> Result<(), String> {
    let error = JSONRPCError { id, error };
    write_message(stdin, &error).await
}

async fn write_message<T>(stdin: &Arc<Mutex<ChildStdin>>, message: &T) -> Result<(), String>
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
