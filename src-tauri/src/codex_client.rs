use anyhow::Result;
use serde_json;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::protocol::{CodexConfig, Event, EventMsg, InputItem, ModelProvider, Op, SandboxPolicy, Submission};

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
                        std::path::PathBuf::from(format!(
                            "{}/.bun/bin/codex",
                            std::env::var("HOME").unwrap_or_default()
                        )),
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

        // Use proto subcommand for stdin/stdout protocol
        cmd.arg("proto");
        
        // For OSS mode, set the model provider and model via config override
        if config.use_oss {
            cmd.arg("-c").arg("model_provider=oss");
            cmd.arg("-c").arg(format!("model={}", config.model));
        }
        
        // Set working directory
        if !config.working_directory.is_empty() {
            cmd.current_dir(&config.working_directory);
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
        let stderr = process.stderr.take().expect("Failed to open stderr");

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

            while let Ok(Some(line)) = lines.next_line().await {
                tracing::debug!("Received line from codex: {}", line);

                // Skip empty lines
                if line.trim().is_empty() {
                    continue;
                }

                // Try to parse as JSON event
                match serde_json::from_str::<Event>(&line) {
                    Ok(event) => {
                        // Forward the event to frontend
                        if let Err(e) = app_clone.emit(
                            &format!("codex-event-{}", session_id_clone),
                            &event,
                        ) {
                            tracing::error!("Failed to emit event: {}", e);
                        }
                    }
                    Err(e) => {
                        tracing::warn!("Failed to parse event JSON: {} - Line: {}", e, line);
                        // If it's not valid JSON, treat as raw output
                        let raw_event = Event {
                            id: "raw_output".to_string(),
                            msg: EventMsg::AgentMessageDelta {
                                delta: line + "\n",
                            },
                        };
                        if let Err(e) = app_clone.emit(
                            &format!("codex-event-{}", session_id_clone),
                            &raw_event,
                        ) {
                            tracing::error!("Failed to emit raw event: {}", e);
                        }
                    }
                }
            }
            tracing::info!("Stdout reader terminated for session: {}", session_id_clone);
        });
        
        // Handle stderr reading
        let session_id_clone2 = session_id.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            
            tracing::info!("Starting stderr reader for session: {}", session_id_clone2);
            
            while let Ok(Some(line)) = lines.next_line().await {
                tracing::warn!("Codex stderr: {}", line);
            }
            
            tracing::info!("Stderr reader terminated for session: {}", session_id_clone2);
        });

        let client = Self { process, stdin_tx };

        // Send configuration to initialize the session using proto subcommand
        let provider = ModelProvider {
            name: if config.use_oss { "oss".to_string() } else { config.provider.clone() },
            base_url: None,
        };
        
        tracing::info!("Config - use_oss: {}, provider: {}, model: {}", 
                      config.use_oss, config.provider, config.model);
        tracing::info!("Final provider config: {:?}", provider);
        
        let sandbox_policy = match config.sandbox_mode.as_str() {
            "read-only" => SandboxPolicy::ReadOnly,
            "workspace-write" => SandboxPolicy::WorkspaceWrite {
                writable_roots: vec![std::path::PathBuf::from(&config.working_directory)],
                network_access: false,
            },
            _ => SandboxPolicy::WorkspaceWrite {
                writable_roots: vec![std::path::PathBuf::from(&config.working_directory)],
                network_access: false,
            },
        };
        
        let config_submission = Submission {
            id: Uuid::new_v4().to_string(),
            op: Op::ConfigureSession {
                provider,
                model: config.model.clone(),
                model_reasoning_effort: "auto".to_string(),
                model_reasoning_summary: "auto".to_string(),
                user_instructions: None,
                base_instructions: None,
                approval_policy: config.approval_policy.clone(),
                sandbox_policy,
                disable_response_storage: false,
                cwd: std::path::PathBuf::from(&config.working_directory),
                resume_path: None,
            },
        };
        
        client.send_submission(config_submission).await?;
        
        Ok(client)
    }

    async fn send_submission(&self, submission: Submission) -> Result<()> {
        let json = serde_json::to_string(&submission)?;
        self.stdin_tx.send(json)?;
        Ok(())
    }

    pub async fn send_user_input(&self, message: String) -> Result<()> {
        // Send user input using the protocol
        let submission = Submission {
            id: Uuid::new_v4().to_string(),
            op: Op::UserInput {
                items: vec![InputItem::Text { text: message }],
            },
        };
        
        self.send_submission(submission).await
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
