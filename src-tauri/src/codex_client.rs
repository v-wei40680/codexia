use anyhow::Result;
use serde_json;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::config::{read_model_providers, read_profiles};
use crate::protocol::{CodexConfig, Event, InputItem, Op, Submission};

// Helper function to extract session_id from codex events
fn get_session_id_from_event(event: &Event) -> Option<String> {
    match &event.msg {
        crate::protocol::EventMsg::SessionConfigured { session_id, .. } => Some(session_id.clone()),
        _ => None,
    }
}
use crate::utils::codex_discovery::discover_codex_command;

pub struct CodexClient {
    #[allow(dead_code)]
    app: AppHandle,
    session_id: String,
    process: Option<Child>,
    stdin_tx: Option<mpsc::UnboundedSender<String>>,
    #[allow(dead_code)]
    config: CodexConfig,
}

impl CodexClient {
    pub async fn new(app: &AppHandle, session_id: String, config: CodexConfig) -> Result<Self> {
        log::debug!("Creating CodexClient for session: {}", session_id);

        // Build codex command based on configuration
        let (command, args): (String, Vec<String>) =
            if let Some(configured_path) = &config.codex_path {
                (configured_path.clone(), vec![])
            } else if let Some(path) = discover_codex_command() {
                (path.to_string_lossy().to_string(), vec![])
            } else {
                return Err(anyhow::anyhow!("Could not find codex executable"));
            };

        let mut cmd = Command::new(&command);
        if !args.is_empty() {
            cmd.args(&args);
        }
        cmd.arg("proto");

        // Load provider configuration from config.toml if provider is specified
        if !config.provider.is_empty() && config.provider != "openai" {
            if let Ok(providers) = read_model_providers().await {
                if let Ok(profiles) = read_profiles().await {
                    // Check if there's a matching provider in config
                    if let Some(provider_config) = providers.get(&config.provider) {
                        // Set model provider based on config
                        cmd.arg("-c")
                            .arg(format!("model_provider={}", provider_config.name));

                        // Set base URL if available
                        if !provider_config.base_url.is_empty() {
                            cmd.arg("-c")
                                .arg(format!("base_url={}", provider_config.base_url));
                        }

                        // Set API key environment variable reference
                        if !provider_config.env_key.is_empty() {
                            cmd.arg("-c")
                                .arg(format!("api_key_env={}", provider_config.env_key));
                        }

                        // Use model from profile if available, otherwise from config
                        let model_to_use = if let Some(profile) = profiles.get(&config.provider) {
                            &profile.model
                        } else {
                            &config.model
                        };

                        if !model_to_use.is_empty() {
                            cmd.arg("-c").arg(format!("model={}", model_to_use));
                        }
                    } else {
                        // Fallback to original logic for custom providers
                        if config.use_oss {
                            cmd.arg("-c").arg("model_provider=oss");
                        } else {
                            cmd.arg("-c")
                                .arg(format!("model_provider={}", config.provider));
                        }

                        if !config.model.is_empty() {
                            cmd.arg("-c").arg(format!("model={}", config.model));
                        }
                    }
                }
            } else {
                // Fallback to original logic if config reading fails
                if config.use_oss {
                    cmd.arg("-c").arg("model_provider=oss");
                } else {
                    cmd.arg("-c")
                        .arg(format!("model_provider={}", config.provider));
                }

                if !config.model.is_empty() {
                    cmd.arg("-c").arg(format!("model={}", config.model));
                }
            }
        } else {
            // Original logic for OSS and default cases
            if config.use_oss {
                cmd.arg("-c").arg("model_provider=oss");
            }

            if !config.model.is_empty() {
                cmd.arg("-c").arg(format!("model={}", config.model));
            }
        }

        if !config.approval_policy.is_empty() {
            cmd.arg("-c")
                .arg(format!("approval_policy={}", config.approval_policy));
        }

        if !config.sandbox_mode.is_empty() {
            let sandbox_config = match config.sandbox_mode.as_str() {
                "read-only" => "sandbox_mode=read-only".to_string(),
                "workspace-write" => "sandbox_mode=workspace-write".to_string(),
                "danger-full-access" => "sandbox_mode=danger-full-access".to_string(),
                _ => "sandbox_mode=workspace-write".to_string(),
            };
            cmd.arg("-c").arg(sandbox_config);
        }

        // Enable streaming by setting show_raw_agent_reasoning=true
        // This is required for agent_message_delta events to be generated
        cmd.arg("-c").arg("show_raw_agent_reasoning=true");

        // Set working directory for the process
        if !config.working_directory.is_empty() {
            cmd.current_dir(&config.working_directory);
        }

        // Add custom arguments
        if let Some(custom_args) = &config.custom_args {
            for arg in custom_args {
                cmd.arg(arg);
            }
        }

        // Print the command to be executed for debugging
        log::debug!("Starting codex with command: {:?}", cmd);

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
                    log::error!("Failed to write to codex stdin: {}", e);
                    break;
                }
                if let Err(e) = stdin_writer.write_all(b"\n").await {
                    log::error!("Failed to write newline to codex stdin: {}", e);
                    break;
                }
                if let Err(e) = stdin_writer.flush().await {
                    log::error!("Failed to flush codex stdin: {}", e);
                    break;
                }
            }
            log::debug!("Stdin writer task terminated");
        });

        // Handle stdout reading
        let app_clone = app.clone();
        let session_id_clone = session_id.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            log::debug!("Starting stdout reader for session: {}", session_id_clone);

            while let Ok(Some(line)) = lines.next_line().await {
                log::debug!("Received line from codex: {}", line);
                if let Ok(event) = serde_json::from_str::<Event>(&line) {
                    log::debug!("Parsed event: {:?}", event);

                    // Log the event for debugging
                    if let Some(event_session_id) = get_session_id_from_event(&event) {
                        log::debug!("Event for session: {}", event_session_id);
                    }

                    // Use a single global event channel instead of per-session channels
                    if let Err(e) = app_clone.emit("codex-events", &event) {
                        log::error!("Failed to emit event: {}", e);
                    }
                } else {
                    log::warn!("Failed to parse codex event: {}", line);
                }
            }
            log::debug!("Stdout reader terminated for session: {}", session_id_clone);
        });

        let client = Self {
            app: app.clone(),
            session_id,
            process: Some(process),
            stdin_tx: Some(stdin_tx),
            config: config.clone(),
        };

        Ok(client)
    }

    async fn send_submission(&self, submission: Submission) -> Result<()> {
        if let Some(stdin_tx) = &self.stdin_tx {
            let json = serde_json::to_string(&submission)?;
            stdin_tx.send(json)?;
        }
        Ok(())
    }

    pub async fn send_user_input(&self, message: String) -> Result<()> {
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

    #[allow(dead_code)]
    pub async fn send_patch_approval(&self, approval_id: String, approved: bool) -> Result<()> {
        let decision = if approved { "allow" } else { "deny" }.to_string();

        let submission = Submission {
            id: Uuid::new_v4().to_string(),
            op: Op::PatchApproval {
                id: approval_id,
                decision,
            },
        };

        self.send_submission(submission).await
    }

    pub async fn interrupt(&self) -> Result<()> {
        let submission = Submission {
            id: Uuid::new_v4().to_string(),
            op: Op::Interrupt,
        };

        self.send_submission(submission).await
    }

    pub async fn close_session(&mut self) -> Result<()> {
        log::debug!("Closing session: {}", self.session_id);

        // Send shutdown command to codex (graceful shutdown)
        let submission = Submission {
            id: Uuid::new_v4().to_string(),
            op: Op::Shutdown,
        };

        if let Err(e) = self.send_submission(submission).await {
            log::error!("Failed to send shutdown command: {}", e);
        }

        // Close stdin channel to signal end of input
        if let Some(stdin_tx) = self.stdin_tx.take() {
            drop(stdin_tx);
            log::debug!("Stdin channel closed");
        }

        // Wait a moment for graceful shutdown, then terminate process if needed
        if let Some(mut process) = self.process.take() {
            if let Some(pid) = process.id() {
                log::debug!("Terminating codex process with PID: {}", pid);
            }

            // Give the process a moment to shutdown gracefully
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

            // Check if process is still running, then kill if necessary
            match process.try_wait() {
                Ok(Some(status)) => {
                    log::debug!("Codex process exited with status: {}", status);
                }
                Ok(None) => {
                    // Process still running, kill it
                    log::debug!("Process still running, terminating...");
                    if let Err(e) = process.kill().await {
                        log::error!("Failed to kill codex process: {}", e);
                    } else {
                        log::debug!("Codex process terminated successfully");
                    }
                }
                Err(e) => {
                    log::error!("Error checking process status: {}", e);
                    // Try to kill anyway
                    if let Err(e) = process.kill().await {
                        log::error!("Failed to kill codex process: {}", e);
                    }
                }
            }
        }

        log::debug!("Session {} closed", self.session_id);
        Ok(())
    }
    
    #[allow(dead_code)]
    pub async fn shutdown(&mut self) -> Result<()> {
        self.close_session().await
    }

    #[allow(dead_code)]
    pub fn is_active(&self) -> bool {
        self.process.is_some() && self.stdin_tx.is_some()
    }
}
