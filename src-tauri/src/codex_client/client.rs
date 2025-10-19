use std::collections::HashMap;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::{anyhow, Context, Result};
use serde::Serialize;
use serde_json::{json, Value};
use tauri::AppHandle;
use tokio::sync::mpsc::{self, UnboundedReceiver, UnboundedSender};
use tokio::sync::{oneshot, Mutex};
use tokio::task::JoinHandle;
use tokio::time::sleep;
use uuid::Uuid;

use crate::jsonrpc::{
    JsonRpcError, JsonRpcErrorMessage, JsonRpcMessage, JsonRpcNotification, JsonRpcRequest,
    JsonRpcResponse, OutgoingJsonRpcMessage, RequestId,
};
use crate::protocol::CodexConfig;

use super::event_handler::emit_to_frontend;
use super::{CommandBuilder, EventHandler, ProcessManager};

const APPROVAL_WAIT_TIMEOUT: Duration = Duration::from_secs(10);
const APPROVAL_POLL_INTERVAL: Duration = Duration::from_millis(50);

#[derive(Clone, Copy, Debug)]
enum ApprovalKind {
    Exec,
    ApplyPatch,
}

#[derive(Default)]
struct ApprovalStore {
    exec_call_to_event: HashMap<String, String>,
    exec_event_to_call: HashMap<String, String>,
    exec_call_to_request: HashMap<String, RequestId>,

    apply_call_to_event: HashMap<String, String>,
    apply_event_to_call: HashMap<String, String>,
    apply_call_to_request: HashMap<String, RequestId>,
}

impl ApprovalStore {
    fn register_event(&mut self, kind: ApprovalKind, call_id: &str, event_id: &str) {
        match kind {
            ApprovalKind::Exec => {
                self.exec_call_to_event
                    .insert(call_id.to_string(), event_id.to_string());
                self.exec_event_to_call
                    .insert(event_id.to_string(), call_id.to_string());
            }
            ApprovalKind::ApplyPatch => {
                self.apply_call_to_event
                    .insert(call_id.to_string(), event_id.to_string());
                self.apply_event_to_call
                    .insert(event_id.to_string(), call_id.to_string());
            }
        }
    }

    fn register_request(&mut self, kind: ApprovalKind, call_id: &str, request_id: &RequestId) {
        match kind {
            ApprovalKind::Exec => {
                self.exec_call_to_request
                    .insert(call_id.to_string(), request_id.clone());
            }
            ApprovalKind::ApplyPatch => {
                self.apply_call_to_request
                    .insert(call_id.to_string(), request_id.clone());
            }
        }
    }

    fn request_id_for_event(&self, kind: ApprovalKind, event_id: &str) -> Option<RequestId> {
        match kind {
            ApprovalKind::Exec => self
                .exec_event_to_call
                .get(event_id)
                .and_then(|call_id| self.exec_call_to_request.get(call_id))
                .cloned(),
            ApprovalKind::ApplyPatch => self
                .apply_event_to_call
                .get(event_id)
                .and_then(|call_id| self.apply_call_to_request.get(call_id))
                .cloned(),
        }
    }

    fn take_request_for_event(&mut self, kind: ApprovalKind, event_id: &str) -> Option<RequestId> {
        match kind {
            ApprovalKind::Exec => {
                if let Some(call_id) = self.exec_event_to_call.remove(event_id) {
                    self.exec_call_to_event.remove(&call_id);
                    self.exec_call_to_request.remove(&call_id)
                } else {
                    None
                }
            }
            ApprovalKind::ApplyPatch => {
                if let Some(call_id) = self.apply_event_to_call.remove(event_id) {
                    self.apply_call_to_event.remove(&call_id);
                    self.apply_call_to_request.remove(&call_id)
                } else {
                    None
                }
            }
        }
    }

    fn has_event(&self, kind: ApprovalKind, event_id: &str) -> bool {
        match kind {
            ApprovalKind::Exec => self.exec_event_to_call.contains_key(event_id),
            ApprovalKind::ApplyPatch => self.apply_event_to_call.contains_key(event_id),
        }
    }
}

type PendingResponseSender = oneshot::Sender<Result<Value, JsonRpcError>>;

struct MessageRouter {
    app: AppHandle,
    session_id: String,
    message_rx: UnboundedReceiver<JsonRpcMessage>,
    pending_requests: Arc<Mutex<HashMap<RequestId, PendingResponseSender>>>,
    approval_store: Arc<Mutex<ApprovalStore>>,
}

impl MessageRouter {
    fn spawn(
        app: AppHandle,
        session_id: String,
        message_rx: UnboundedReceiver<JsonRpcMessage>,
        pending_requests: Arc<Mutex<HashMap<RequestId, PendingResponseSender>>>,
        approval_store: Arc<Mutex<ApprovalStore>>,
    ) -> JoinHandle<()> {
        let router = Self {
            app,
            session_id,
            message_rx,
            pending_requests,
            approval_store,
        };

        tokio::spawn(async move {
            router.run().await;
        })
    }

    async fn run(mut self) {
        while let Some(message) = self.message_rx.recv().await {
            match message {
                JsonRpcMessage::Response(response) => self.handle_response(response).await,
                JsonRpcMessage::Error(error) => self.handle_error(error).await,
                JsonRpcMessage::Notification(notification) => {
                    self.handle_notification(notification).await
                }
                JsonRpcMessage::Request(request) => {
                    self.handle_server_request(request).await;
                }
            }
        }

        log::debug!("Message router for session {} terminated", self.session_id);
    }

    async fn handle_response(&self, response: JsonRpcResponse) {
        let JsonRpcResponse { id, result } = response;
        let sender = {
            let mut pending = self.pending_requests.lock().await;
            pending.remove(&id)
        };

        if let Some(tx) = sender {
            let _ = tx.send(Ok(result));
        } else {
            log::warn!(
                "Received unexpected JSON-RPC response with id {:?} for session {}",
                id,
                self.session_id
            );
        }
    }

    async fn handle_error(&self, error: JsonRpcErrorMessage) {
        let JsonRpcErrorMessage { id, error } = error;
        let sender = {
            let mut pending = self.pending_requests.lock().await;
            pending.remove(&id)
        };

        if let Some(tx) = sender {
            let _ = tx.send(Err(error));
        } else {
            log::warn!(
                "Received unexpected JSON-RPC error with id {:?} for session {}",
                id,
                self.session_id
            );
        }
    }

    async fn handle_notification(&self, notification: JsonRpcNotification) {
        if notification.method.starts_with("codex/event/") {
            self.handle_codex_event(notification).await;
        } else {
            log::debug!(
                "Unhandled JSON-RPC notification '{}' for session {}",
                notification.method,
                self.session_id
            );
        }
    }

    async fn handle_codex_event(&self, notification: JsonRpcNotification) {
        let Some(params) = notification.params else {
            log::warn!(
                "codex/event notification missing params for session {}",
                self.session_id
            );
            return;
        };

        let mut event_object = match params {
            Value::Object(map) => map,
            other => {
                log::warn!(
                    "codex/event notification had non-object params ({other:?}) for session {}",
                    self.session_id
                );
                return;
            }
        };

        let conversation_id = event_object
            .remove("conversationId")
            .and_then(|value| value.as_str().map(ToString::to_string));

        let event_id = event_object
            .get("id")
            .and_then(|value| value.as_str())
            .map(ToString::to_string);

        if let (Some(event_id), Some(msg_value)) = (event_id.clone(), event_object.get("msg")) {
            if let Some(msg_object) = msg_value.as_object() {
                if let Some(event_type) = msg_object.get("type").and_then(|value| value.as_str()) {
                    match event_type {
                        "exec_approval_request" => {
                            if let Some(call_id) =
                                msg_object.get("call_id").and_then(|value| value.as_str())
                            {
                                let mut store = self.approval_store.lock().await;
                                store.register_event(ApprovalKind::Exec, call_id, &event_id);
                            }
                        }
                        "apply_patch_approval_request" => {
                            if let Some(call_id) =
                                msg_object.get("call_id").and_then(|value| value.as_str())
                            {
                                let mut store = self.approval_store.lock().await;
                                store.register_event(ApprovalKind::ApplyPatch, call_id, &event_id);
                            }
                        }
                        _ => {}
                    }
                }
            }
        }

        event_object.insert(
            "session_id".to_string(),
            Value::String(self.session_id.clone()),
        );

        if let Some(conversation_id) = conversation_id {
            event_object.insert(
                "conversation_id".to_string(),
                Value::String(conversation_id),
            );
        }

        let payload = Value::Object(event_object.clone());
        emit_to_frontend(&self.app, "codex-events", &payload).await;
    }

    async fn handle_server_request(&self, request: JsonRpcRequest) {
        let JsonRpcRequest { id, method, params } = request;

        match method.as_str() {
            "execCommandApproval" => {
                if let Some(call_id) = extract_string_field(&params, "callId") {
                    let mut store = self.approval_store.lock().await;
                    store.register_request(ApprovalKind::Exec, &call_id, &id);
                } else {
                    log::warn!(
                        "execCommandApproval request missing callId for session {}",
                        self.session_id
                    );
                }
            }
            "applyPatchApproval" => {
                if let Some(call_id) = extract_string_field(&params, "callId") {
                    let mut store = self.approval_store.lock().await;
                    store.register_request(ApprovalKind::ApplyPatch, &call_id, &id);
                } else {
                    log::warn!(
                        "applyPatchApproval request missing callId for session {}",
                        self.session_id
                    );
                }
            }
            other => {
                log::warn!(
                    "Unsupported JSON-RPC request '{}' received for session {}",
                    other,
                    self.session_id
                );
            }
        }
    }
}

pub struct CodexClient {
    app: AppHandle,
    session_id: String,
    config: CodexConfig,
    process_manager: ProcessManager,
    request_counter: Arc<AtomicI64>,
    pending_requests: Arc<Mutex<HashMap<RequestId, PendingResponseSender>>>,
    approval_store: Arc<Mutex<ApprovalStore>>,
    conversation_id: Arc<Mutex<Option<String>>>,
    subscription_id: Arc<Mutex<Option<String>>>,
    _message_task: JoinHandle<()>,
}

impl CodexClient {
    pub async fn new(app: &AppHandle, session_id: String, config: CodexConfig) -> Result<Self> {
        log::debug!(
            "Creating CodexClient for session {} with config: {:?}",
            session_id,
            config
        );

        let (cmd, env_vars) = CommandBuilder::build_command(&config).await?;
        let mut process_manager = ProcessManager::start_process(cmd, env_vars, &config).await?;

        let (message_tx, message_rx): (
            UnboundedSender<JsonRpcMessage>,
            UnboundedReceiver<JsonRpcMessage>,
        ) = mpsc::unbounded_channel();

        if let Some(process) = &mut process_manager.process {
            let stdout = process
                .stdout
                .take()
                .context("Failed to open Codex stdout")?;
            let stderr = process
                .stderr
                .take()
                .context("Failed to open Codex stderr")?;

            EventHandler::start_stdout_handler(app.clone(), stdout, session_id.clone(), message_tx);
            EventHandler::start_stderr_handler(stderr, session_id.clone());
        }

        let pending_requests = Arc::new(Mutex::new(HashMap::new()));
        let approval_store = Arc::new(Mutex::new(ApprovalStore::default()));
        let conversation_id = Arc::new(Mutex::new(None));
        let subscription_id = Arc::new(Mutex::new(None));

        let message_task = MessageRouter::spawn(
            app.clone(),
            session_id.clone(),
            message_rx,
            pending_requests.clone(),
            approval_store.clone(),
        );

        let mut client = Self {
            app: app.clone(),
            session_id,
            config: config.clone(),
            process_manager,
            request_counter: Arc::new(AtomicI64::new(0)),
            pending_requests,
            approval_store,
            conversation_id,
            subscription_id,
            _message_task: message_task,
        };

        if let Err(err) = client.bootstrap().await {
            log::error!("Failed to bootstrap Codex session: {err}");
            let _ = client.process_manager.terminate().await;
            return Err(err);
        }

        Ok(client)
    }

    async fn bootstrap(&mut self) -> Result<()> {
        self.initialize().await?;
        self.configure_conversation().await?;
        Ok(())
    }

    async fn initialize(&self) -> Result<()> {
        let params = json!({
            "clientInfo": {
                "name": "codexia",
                "title": "Codexia",
                "version": env!("CARGO_PKG_VERSION"),
            }
        });

        let _ = self
            .send_request("initialize", Some(params))
            .await
            .context("Failed to initialize Codex app-server")?;

        self.send_notification("initialized", None)?;
        Ok(())
    }

    async fn configure_conversation(&self) -> Result<()> {
        if let Some(resume_path) = self
            .config
            .resume_path
            .as_ref()
            .filter(|path| !path.is_empty())
        {
            self.resume_conversation(resume_path.clone()).await
        } else {
            self.start_new_conversation().await
        }
    }

    async fn start_new_conversation(&self) -> Result<()> {
        let params = Value::Object(self.build_conversation_overrides());
        let response = self
            .send_request("newConversation", Some(params))
            .await
            .context("Failed to start new Codex conversation")?;

        let conversation_id = response
            .get("conversationId")
            .and_then(|value| value.as_str())
            .ok_or_else(|| anyhow!("newConversation response missing conversationId"))?
            .to_string();

        {
            let mut guard = self.conversation_id.lock().await;
            *guard = Some(conversation_id.clone());
        }

        self.add_conversation_listener(&conversation_id).await?;
        Ok(())
    }

    async fn resume_conversation(&self, resume_path: String) -> Result<()> {
        let mut params = serde_json::Map::new();
        params.insert("path".to_string(), Value::String(resume_path.clone()));

        let overrides = self.build_conversation_overrides();
        if !overrides.is_empty() {
            params.insert("overrides".to_string(), Value::Object(overrides));
        }

        let response = self
            .send_request("resumeConversation", Some(Value::Object(params)))
            .await
            .context("Failed to resume Codex conversation")?;

        let conversation_id = response
            .get("conversationId")
            .and_then(|value| value.as_str())
            .ok_or_else(|| anyhow!("resumeConversation response missing conversationId"))?
            .to_string();

        {
            let mut guard = self.conversation_id.lock().await;
            *guard = Some(conversation_id.clone());
        }

        self.add_conversation_listener(&conversation_id).await?;

        if let Some(initial_messages) = response
            .get("initialMessages")
            .and_then(|value| value.as_array())
        {
            for msg in initial_messages {
                let payload = json!({
                    "id": format!("resume-{}", Uuid::new_v4()),
                    "msg": msg,
                    "session_id": self.session_id,
                });
                emit_to_frontend(&self.app, "codex-events", &payload).await;
            }
        }

        Ok(())
    }

    async fn add_conversation_listener(&self, conversation_id: &str) -> Result<()> {
        let params = json!({
            "conversationId": conversation_id,
        });

        let response = self
            .send_request("addConversationListener", Some(params))
            .await
            .context("Failed to subscribe to Codex conversation events")?;

        if let Some(subscription_id) = response
            .get("subscriptionId")
            .and_then(|value| value.as_str())
        {
            let mut guard = self.subscription_id.lock().await;
            *guard = Some(subscription_id.to_string());
        }

        Ok(())
    }

    fn build_conversation_overrides(&self) -> serde_json::Map<String, Value> {
        let mut params = serde_json::Map::new();

        if !self.config.model.is_empty() {
            params.insert(
                "model".to_string(),
                Value::String(self.config.model.clone()),
            );
        }

        if !self.config.working_directory.is_empty() {
            params.insert(
                "cwd".to_string(),
                Value::String(self.config.working_directory.clone()),
            );
        }

        if !self.config.approval_policy.is_empty() {
            params.insert(
                "approvalPolicy".to_string(),
                Value::String(self.config.approval_policy.clone()),
            );
        }

        if !self.config.sandbox_mode.is_empty() {
            params.insert(
                "sandbox".to_string(),
                Value::String(self.config.sandbox_mode.clone()),
            );
        }

        if let Some(reasoning_effort) = self
            .config
            .reasoning_effort
            .as_ref()
            .filter(|effort| !effort.is_empty())
        {
            params.insert(
                "effort".to_string(),
                Value::String(reasoning_effort.clone()),
            );
        }

        if self.config.tools_web_search.unwrap_or(false) {
            let mut config_map = serde_json::Map::new();
            config_map.insert("tools.web_search".to_string(), Value::Bool(true));
            params.insert("config".to_string(), Value::Object(config_map));
        }

        params
    }

    pub async fn send_user_input(&self, message: String) -> Result<()> {
        let conversation_id = self.conversation_id_required().await?;

        let payload = SendUserMessageParams {
            conversation_id,
            items: vec![ConversationInputItem::Text { text: message }],
        };

        let params = serde_json::to_value(payload)?;
        let _ = self
            .send_request("sendUserMessage", Some(params))
            .await
            .context("Failed to send user message to Codex")?;
        Ok(())
    }

    pub async fn send_exec_approval(&self, approval_id: String, approved: bool) -> Result<()> {
        let decision = if approved { "approved" } else { "denied" };
        let request_id = self
            .await_request_id(&approval_id, ApprovalKind::Exec)
            .await
            .with_context(|| format!("Execution approval {approval_id} not ready"))?;

        self.send_approval_response(request_id, decision)
            .context("Failed to send exec approval response")
    }

    pub async fn send_apply_patch_approval(
        &self,
        approval_id: String,
        approved: bool,
    ) -> Result<()> {
        let decision = if approved { "approved" } else { "denied" };
        let request_id = self
            .await_request_id(&approval_id, ApprovalKind::ApplyPatch)
            .await
            .with_context(|| format!("Patch approval {approval_id} not ready"))?;

        self.send_approval_response(request_id, decision)
            .context("Failed to send patch approval response")
    }

    pub async fn interrupt(&self) -> Result<()> {
        let conversation_id = self.conversation_id_required().await?;

        let params = json!({
            "conversationId": conversation_id,
        });

        let _ = self
            .send_request("interruptConversation", Some(params))
            .await
            .context("Failed to interrupt Codex conversation")?;
        Ok(())
    }

    async fn await_request_id(&self, event_id: &str, kind: ApprovalKind) -> Result<RequestId> {
        let deadline = Instant::now() + APPROVAL_WAIT_TIMEOUT;

        loop {
            let (maybe_request_id, event_known) = {
                let store = self.approval_store.lock().await;
                (
                    store.request_id_for_event(kind, event_id),
                    store.has_event(kind, event_id),
                )
            };

            if let Some(_request_id) = maybe_request_id {
                let mut store = self.approval_store.lock().await;
                if let Some(confirmed_id) = store.take_request_for_event(kind, event_id) {
                    return Ok(confirmed_id);
                }
            } else if !event_known {
                return Err(anyhow!(
                    "Approval request {} (kind: {:?}) is no longer pending",
                    event_id,
                    kind
                ));
            }

            if Instant::now() >= deadline {
                return Err(anyhow!(
                    "Timed out waiting for approval request {} (kind: {:?})",
                    event_id,
                    kind
                ));
            }

            sleep(APPROVAL_POLL_INTERVAL).await;
        }
    }

    async fn conversation_id_required(&self) -> Result<String> {
        self.conversation_id
            .lock()
            .await
            .clone()
            .ok_or_else(|| anyhow!("No active Codex conversation"))
    }

    async fn send_request(&self, method: &str, params: Option<Value>) -> Result<Value> {
        let request_id = RequestId::Integer(self.request_counter.fetch_add(1, Ordering::Relaxed));
        let (tx, rx) = oneshot::channel();

        {
            let mut pending = self.pending_requests.lock().await;
            pending.insert(request_id.clone(), tx);
        }

        let request = JsonRpcRequest {
            id: request_id.clone(),
            method: method.to_string(),
            params,
        };

        let payload = serde_json::to_string(&OutgoingJsonRpcMessage::Request(request))?;
        if let Err(err) = self.process_manager.send_to_stdin(payload) {
            let mut pending = self.pending_requests.lock().await;
            pending.remove(&request_id);
            return Err(err);
        }

        match rx.await {
            Ok(Ok(value)) => Ok(value),
            Ok(Err(err)) => Err(anyhow!("JSON-RPC error {}: {}", err.code, err.message)),
            Err(_) => Err(anyhow!("JSON-RPC response channel closed")),
        }
    }

    fn send_notification(&self, method: &str, params: Option<Value>) -> Result<()> {
        let notification = JsonRpcNotification {
            method: method.to_string(),
            params,
        };
        let payload = serde_json::to_string(&OutgoingJsonRpcMessage::Notification(notification))?;
        self.process_manager.send_to_stdin(payload)
    }

    fn send_approval_response(&self, request_id: RequestId, decision: &str) -> Result<()> {
        let result = json!({
            "decision": decision,
        });
        let response = JsonRpcResponse {
            id: request_id,
            result,
        };
        let payload = serde_json::to_string(&OutgoingJsonRpcMessage::Response(response))?;
        self.process_manager
            .send_to_stdin(payload)
            .context("Failed to write approval response to Codex")
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SendUserMessageParams {
    #[serde(rename = "conversationId")]
    conversation_id: String,
    items: Vec<ConversationInputItem>,
}

#[derive(Serialize)]
#[serde(tag = "type", content = "data", rename_all = "camelCase")]
enum ConversationInputItem {
    Text { text: String },
}

fn extract_string_field(params: &Option<Value>, key: &str) -> Option<String> {
    params
        .as_ref()
        .and_then(|value| value.get(key))
        .and_then(|value| value.as_str())
        .map(ToString::to_string)
}
