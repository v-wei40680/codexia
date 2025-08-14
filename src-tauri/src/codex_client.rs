use anyhow::Result;
use serde_json;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::protocol::{CodexConfig, Event, EventMsg, Op, Submission};

pub struct CodexClient {
    process: Child,
    stdin_tx: mpsc::UnboundedSender<String>,
}

impl CodexClient {
    pub async fn new(app: &AppHandle, session_id: String, config: CodexConfig) -> Result<Self> {
        // Build codex command based on configuration
        let codex_path = if let Some(configured_path) = &config.codex_path {
            // Use user-configured path
            std::path::PathBuf::from(configured_path)
        } else {
            // Try to find codex in common locations or use from PATH
            which::which("codex")
                .or_else(|_| {
                    // Try common installation paths
                    let common_paths = vec![
                        std::path::PathBuf::from("/usr/local/bin/codex"),
                        std::path::PathBuf::from("/opt/homebrew/bin/codex"),
                        std::path::PathBuf::from(format!(
                            "{}/.cargo/bin/codex",
                            std::env::var("HOME").unwrap_or_default()
                        )),
                        // Note: Avoid .bun/bin/codex as it may not be the correct version
                    ];

                    for path in common_paths {
                        if path.exists() {
                            return Ok(path);
                        }
                    }

                    Err(std::io::Error::from(std::io::ErrorKind::NotFound))
                })
                .unwrap_or_else(|_| std::path::PathBuf::from("codex"))
        };

        // Validate that the codex executable exists
        if !codex_path.exists() {
            return Err(anyhow::anyhow!(
                "Codex executable not found at path: {}. Please configure the correct path in settings.", 
                codex_path.display()
            ));
        }

        let mut cmd = Command::new(codex_path);

        // Use interactive mode instead of proto for streaming support
        if config.use_oss {
            cmd.arg("--oss");
        }

        if !config.model.is_empty() {
            cmd.arg("-m").arg(&config.model);
        }

        if !config.approval_policy.is_empty() {
            cmd.arg("-a").arg(&config.approval_policy);
        }

        if !config.sandbox_mode.is_empty() {
            cmd.arg("-s").arg(&config.sandbox_mode);
        }

        // Set working directory
        if !config.working_directory.is_empty() {
            cmd.arg("-C").arg(&config.working_directory);
        }

        // Add custom arguments
        if let Some(custom_args) = &config.custom_args {
            for arg in custom_args {
                cmd.arg(arg);
            }
        }

        // Print command to execute for debugging
        tracing::info!("Starting codex with command: {:?}", cmd);

        let mut process = cmd
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        let stdin = process.stdin.take().expect("Failed to open stdin");
        let stdout = process.stdout.take().expect("Failed to open stdout");

        let (stdin_tx, mut stdin_rx) = mpsc::unbounded_channel::<String>();

        // Handle stdin writing
        let mut stdin_writer = stdin;
        tokio::spawn(async move {
            while let Some(line) = stdin_rx.recv().await {
                if let Err(e) = stdin_writer.write_all(line.as_bytes()).await {
                    tracing::warn!("Failed to write to codex stdin: {}", e);
                    break;
                }
                if let Err(e) = stdin_writer.write_all(b"\n").await {
                    tracing::warn!("Failed to write newline to codex stdin: {}", e);
                    break;
                }
                if let Err(e) = stdin_writer.flush().await {
                    tracing::warn!("Failed to flush codex stdin: {}", e);
                    break;
                }
            }
            tracing::info!("Stdin writer task terminated");
        });

        // Handle stdout reading
        let app_clone = app.clone();
        let session_id_clone = session_id.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            tracing::info!("Starting stdout reader for session: {}", session_id_clone);

            let mut response_buffer = String::new();
            let mut in_response = false;

            while let Ok(Some(line)) = lines.next_line().await {
                tracing::debug!("Received line from codex: {}", line);

                // Skip terminal control sequences
                if line.starts_with("\x1b[") || line == "[?2004h" || line == "[?2004l" {
                    continue;
                }

                // Check if this line indicates the start of a response
                if !in_response && !line.trim().is_empty() {
                    in_response = true;
                    response_buffer.clear();

                    // Create task_started event
                    let task_started_event = Event {
                        id: "task_started".to_string(),
                        msg: EventMsg::TaskStarted,
                    };
                    if let Err(e) = app_clone.emit(
                        &format!("codex-event-{}", session_id_clone),
                        &task_started_event,
                    ) {
                        tracing::error!("Failed to emit task_started event: {}", e);
                    }
                }

                if in_response {
                    if !line.trim().is_empty() {
                        // Send streaming delta
                        let delta_event = Event {
                            id: "stream_delta".to_string(),
                            msg: EventMsg::AgentMessageDelta {
                                delta: line.clone() + "\n",
                            },
                        };
                        if let Err(e) = app_clone
                            .emit(&format!("codex-event-{}", session_id_clone), &delta_event)
                        {
                            tracing::error!("Failed to emit delta event: {}", e);
                        }

                        response_buffer.push_str(&line);
                        response_buffer.push('\n');
                    }
                }
            }
            tracing::info!("Stdout reader terminated for session: {}", session_id_clone);
        });

        let client = Self { process, stdin_tx };

        // Interactive mode doesn't need configuration - it's ready to receive messages

        Ok(client)
    }

    async fn send_submission(&self, submission: Submission) -> Result<()> {
        let json = serde_json::to_string(&submission)?;
        self.stdin_tx.send(json)?;
        Ok(())
    }

    pub async fn send_user_input(&self, message: String) -> Result<()> {
        // In interactive mode, we send text directly
        self.stdin_tx.send(message)?;
        Ok(())
    }

    pub async fn send_exec_approval(&self, approval_id: String, approved: bool) -> Result<()> {
        let decision = if approved { "allow" } else { "deny" }.to_string();

        let submission = Submission {
            id: Uuid::new_v4().to_string(),
            op: Op::ExecApproval {
                id: approval_id,
                decision,
            },
        };

        self.send_submission(submission).await
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        // Send shutdown command
        let submission = Submission {
            id: Uuid::new_v4().to_string(),
            op: Op::Shutdown,
        };

        if let Err(e) = self.send_submission(submission).await {
            tracing::warn!("Failed to send shutdown command: {}", e);
        }

        // Terminate process
        if let Err(e) = self.process.kill().await {
            tracing::warn!("Failed to kill codex process: {}", e);
        }

        Ok(())
    }
}
