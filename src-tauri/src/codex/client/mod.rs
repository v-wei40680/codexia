use std::collections::HashMap;
use std::process::Stdio;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;

use codex_app_server_protocol::{
    AddConversationListenerParams, AddConversationSubscriptionResponse, ClientInfo,
    InitializeParams, InterruptConversationParams, InterruptConversationResponse,
    JSONRPCErrorError, JSONRPCNotification, JSONRPCRequest, NewConversationParams,
    NewConversationResponse, RemoveConversationListenerParams,
    RemoveConversationSubscriptionResponse, RequestId, ResumeConversationParams,
    ResumeConversationResponse, SendUserMessageParams, SendUserMessageResponse,
};
use codex_protocol::protocol::ReviewDecision;
use serde::de::DeserializeOwned;
use serde_json::Value;
use tauri::AppHandle;
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::{oneshot, Mutex};

use crate::utils::codex_discovery::discover_codex_command;

mod handlers;
mod readers;
mod transport;

use readers::{spawn_stderr_reader, spawn_stdout_reader};
use transport::{respond_with_review_decision, write_message};

type JsonRpcResult = Result<Value, JSONRPCErrorError>;
pub(super) type PendingRequestMap = Arc<Mutex<HashMap<RequestId, oneshot::Sender<JsonRpcResult>>>>;
pub(super) type PendingServerRequestMap = Arc<Mutex<HashMap<String, PendingServerRequest>>>;

#[derive(Clone)]
pub struct CodexAppServerClient {
    _child: Arc<Mutex<Child>>,
    stdin: Arc<Mutex<ChildStdin>>,
    pending_requests: PendingRequestMap,
    next_request_id: Arc<AtomicI64>,
    pending_server_requests: PendingServerRequestMap,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum PendingRequestKind {
    ExecCommand,
    ApplyPatch,
}

#[derive(Clone)]
pub(super) struct PendingServerRequest {
    pub request_id: RequestId,
    pub kind: PendingRequestKind,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendErrorPayload {
    pub code: i64,
    pub message: String,
    pub data: Option<serde_json::Value>,
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
            pending_requests.clone(),
            pending_server_requests.clone(),
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
        overrides: Option<NewConversationParams>,
    ) -> Result<NewConversationResponse, String> {
        let mut params_value = serde_json::to_value(params).map_err(|err| err.to_string())?;
        if let Some(overrides_params) = overrides {
            let overrides_value =
                serde_json::to_value(overrides_params).map_err(|err| err.to_string())?;
            if let (Some(map), Some(overrides_map)) =
                (params_value.as_object_mut(), overrides_value.as_object())
            {
                map.extend(overrides_map.clone());
            }
        }
        self.request("newConversation", Some(params_value)).await
    }

    pub async fn resume_conversation(
        &self,
        params: ResumeConversationParams,
        overrides: Option<NewConversationParams>,
    ) -> Result<ResumeConversationResponse, String> {
        let mut params_value = serde_json::to_value(params).map_err(|err| err.to_string())?;
        if let Some(overrides_params) = overrides {
            let overrides_value =
                serde_json::to_value(overrides_params).map_err(|err| err.to_string())?;
            if let (Some(map), Some(overrides_map)) =
                (params_value.as_object_mut(), overrides_value.as_object())
            {
                map.extend(overrides_map.clone());
            }
        }
        self.request("resumeConversation", Some(params_value)).await
    }

    pub async fn add_conversation_listener(
        &self,
        params: AddConversationListenerParams,
    ) -> Result<AddConversationSubscriptionResponse, String> {
        let params_value = serde_json::to_value(params).map_err(|err| err.to_string())?;
        self.request("addConversationListener", Some(params_value))
            .await
    }

    pub async fn remove_conversation_listener(
        &self,
        params: RemoveConversationListenerParams,
    ) -> Result<RemoveConversationSubscriptionResponse, String> {
        let params_value = serde_json::to_value(params).map_err(|err| err.to_string())?;
        self.request("removeConversationListener", Some(params_value))
            .await
    }

    pub async fn send_user_message(
        &self,
        params: SendUserMessageParams,
    ) -> Result<SendUserMessageResponse, String> {
        let params_value = serde_json::to_value(params).map_err(|err| err.to_string())?;
        self.request("sendUserMessage", Some(params_value)).await
    }

    pub async fn interrupt_conversation(
        &self,
        params: InterruptConversationParams,
    ) -> Result<InterruptConversationResponse, String> {
        let params_value = serde_json::to_value(params).map_err(|err| err.to_string())?;
        self.request("interruptConversation", Some(params_value))
            .await
    }

    pub async fn respond_exec_command_request(
        &self,
        request_token: &str,
        decision: ReviewDecision,
    ) -> Result<(), String> {
        self.respond_pending_request(request_token, PendingRequestKind::ExecCommand, decision)
            .await
    }

    pub async fn respond_apply_patch_request(
        &self,
        request_token: &str,
        decision: ReviewDecision,
    ) -> Result<(), String> {
        self.respond_pending_request(request_token, PendingRequestKind::ApplyPatch, decision)
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
