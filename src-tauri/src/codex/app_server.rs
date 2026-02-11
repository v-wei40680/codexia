use super::server_request::handle_server_request;
use crate::codex::EventSink;
use codex_app_server_protocol::{
    JSONRPCMessage, JSONRPCResponse, RequestId, ServerNotification, ServerRequest,
};
use serde_json::Value;
use std::collections::HashMap;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{ChildStdin, Command};
use tokio::sync::{Mutex, oneshot};

use codex_finder::discover_codex_command;

pub struct CodexAppServer {
    stdin: Mutex<ChildStdin>,
    pending: Mutex<HashMap<u64, oneshot::Sender<Result<Value, String>>>>,
    next_id: AtomicU64,
}

impl CodexAppServer {
    async fn write_message(&self, value: Value) -> Result<(), String> {
        let mut stdin = self.stdin.lock().await;
        let mut line = serde_json::to_string(&value).map_err(|e| e.to_string())?;
        line.push('\n');
        stdin
            .write_all(line.as_bytes())
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn send_request(&self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = oneshot::channel();
        self.pending.lock().await.insert(id, tx);

        self.write_message(serde_json::json!({
            "id": id,
            "method": method,
            "params": params
        }))
        .await?;

        rx.await.map_err(|_| "request canceled".to_string())?
    }

    pub async fn send_response(&self, id: RequestId, result: Value) -> Result<(), String> {
        let message = JSONRPCResponse { id, result };
        let value = serde_json::to_value(message).map_err(|e| e.to_string())?;
        self.write_message(value).await
    }

    pub async fn send_notification(
        &self,
        method: &str,
        params: Option<Value>,
    ) -> Result<(), String> {
        let value = if let Some(params) = params {
            serde_json::json!({ "method": method, "params": params })
        } else {
            serde_json::json!({ "method": method })
        };
        self.write_message(value).await
    }
}

pub struct AppState {
    pub codex: Arc<CodexAppServer>,
}

pub async fn connect_codex(event_sink: Arc<dyn EventSink>) -> Result<Arc<CodexAppServer>, String> {
    let codex_bin =
        discover_codex_command().ok_or_else(|| "Unable to locate codex binary".to_string())?;

    #[cfg(target_os = "windows")]
    let mut command = {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;

        let mut cmd = Command::new("powershell.exe");
        cmd.arg("-NoLogo")
            .arg("-NoProfile")
            .arg("-NonInteractive")
            .arg("-ExecutionPolicy")
            .arg("Bypass")
            .arg("-Command")
            .arg("$codex = $args[0]; & $codex app-server")
            .arg(codex_bin);
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd
    };

    #[cfg(not(target_os = "windows"))]
    let mut command = {
        let mut cmd = Command::new(codex_bin);
        cmd.arg("app-server");
        cmd
    };

    command.stdin(std::process::Stdio::piped());
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());

    let mut child = command.spawn().map_err(|e| e.to_string())?;
    let stdin = child.stdin.take().ok_or("missing stdin")?;
    let stdout = child.stdout.take().ok_or("missing stdout")?;
    let stderr = child.stderr.take().ok_or("missing stderr")?;

    let client = Arc::new(CodexAppServer {
        stdin: Mutex::new(stdin),
        pending: Mutex::new(HashMap::new()),
        next_id: AtomicU64::new(1),
    });

    // Spawn stdout reader task
    let client_clone = Arc::clone(&client);
    let event_sink_clone = Arc::clone(&event_sink);
    tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }

            let value: Value = match serde_json::from_str(&line) {
                Ok(v) => v,
                Err(err) => {
                    println!("codex:notification (parseError): {:?}", err);
                    event_sink_clone.emit(
                        "codex:notification",
                        serde_json::json!({
                            "method": "codex/parseError",
                            "params": { "error": err.to_string(), "raw": line }
                        }),
                    );
                    continue;
                }
            };

            // Classify message type
            if let Ok(message) = serde_json::from_value::<JSONRPCMessage>(value.clone()) {
                match message {
                    JSONRPCMessage::Response(response) => {
                        let id = match response.id {
                            RequestId::Integer(i) => i as u64,
                            RequestId::String(ref s) => {
                                // Try to parse string as number, skip if fails
                                match s.parse::<u64>() {
                                    Ok(n) => n,
                                    Err(_) => continue,
                                }
                            }
                        };
                        if let Some(tx) = client_clone.pending.lock().await.remove(&id) {
                            let _ = tx.send(Ok(response.result));
                        }
                    }
                    JSONRPCMessage::Error(err) => {
                        let id = match err.id {
                            RequestId::Integer(i) => i as u64,
                            RequestId::String(ref s) => match s.parse::<u64>() {
                                Ok(n) => n,
                                Err(_) => continue,
                            },
                        };
                        if let Some(tx) = client_clone.pending.lock().await.remove(&id) {
                            let _ = tx.send(Err(format!("Request failed: {:?}", err)));
                        }
                    }
                    JSONRPCMessage::Request(request) => {
                        // Handle server requests
                        if let Ok(server_request) = ServerRequest::try_from(request) {
                            handle_server_request(&event_sink_clone, server_request).await;
                        }
                    }
                    JSONRPCMessage::Notification(notification) => {
                        let method = notification.method.clone();
                        if let Ok(server_notification) = ServerNotification::try_from(notification)
                        {
                            if !matches!(
                                method.as_str(),
                                "rawResponseItem/completed"
                                    | "item/reasoning/textDelta"
                                    | "item/agentMessage/delta"
                                    | "item/reasoning/summaryPartAdded"
                                    | "item/reasoning/summaryTextDelta"
                                    | "thread/tokenUsage/updated"
                                    | "account/rateLimits/updated"
                            ) {
                                println!(
                                    "codex:notification: {}",
                                    serde_json::to_string(&server_notification).unwrap_or_default()
                                );
                            }
                            match serde_json::to_value(&server_notification) {
                                Ok(payload) => {
                                    event_sink_clone.emit("codex:notification", payload);
                                }
                                Err(err) => {
                                    println!("codex:notification (serializeError): {:?}", err);
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    // Spawn stderr reader task
    let event_sink_clone = Arc::clone(&event_sink);
    tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if line.trim().is_empty() {
                continue;
            }
            println!("codex:notification (stderr): {}", line);
            event_sink_clone.emit(
                "codex:notification",
                serde_json::json!({
                    "method": "codex/stderr",
                    "params": { "message": line }
                }),
            );
        }
    });

    Ok(client)
}

pub async fn initialize_codex(
    codex: &CodexAppServer,
    event_sink: Arc<dyn EventSink>,
) -> Result<(), String> {
    let params = serde_json::json!({
        "clientInfo": {
            "name": "codexia",
            "title": "Codexia",
            "version": env!("CARGO_PKG_VERSION")
        }
    });

    let result = codex.send_request("initialize", params).await?;
    println!("Codex initialized successfully: {:?}", result);

    if let Err(err) = codex.send_notification("initialized", None).await {
        eprintln!("Failed to send initialized notification: {}", err);
    }

    event_sink.emit(
        "codex:notification",
        serde_json::json!({
            "method": "codex/connected",
            "params": {}
        }),
    );

    Ok(())
}
