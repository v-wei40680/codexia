use anyhow::Result;
use serde_json;
use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::{CodexConfig, Event, EventMsg, InputItem, ModelProvider, Op, SandboxPolicy, Submission};

pub struct CodexClient {
    app: AppHandle,
    session_id: String,
    process: Child,
    stdin_tx: mpsc::UnboundedSender<String>,
    config: CodexConfig,
}

impl CodexClient {
    pub async fn new(app: &AppHandle, session_id: String, config: CodexConfig) -> Result<Self> {
        // 根据配置构建 codex 命令
        let mut cmd = Command::new("codex");
        cmd.arg("proto");
        
        // 使用 -c 配置参数格式 (codex proto 只支持 -c 配置)
        if config.use_oss {
            cmd.arg("-c").arg("model_provider=oss");
        }
        
        if !config.model.is_empty() {
            cmd.arg("-c").arg(format!("model=\"{}\"", config.model));
        }
        
        if !config.approval_policy.is_empty() {
            cmd.arg("-c").arg(format!("approval_policy=\"{}\"", config.approval_policy));
        }
        
        if !config.sandbox_mode.is_empty() {
            let sandbox_config = match config.sandbox_mode.as_str() {
                "read-only" => "sandbox_policy=\"read-only\"".to_string(),
                "workspace-write" => "sandbox_policy=\"workspace-write\"".to_string(), 
                "danger-full-access" => "sandbox_policy=\"danger-full-access\"".to_string(),
                _ => "sandbox_policy=\"workspace-write\"".to_string(),
            };
            cmd.arg("-c").arg(sandbox_config);
        }
        
        // 设置工作目录
        if !config.working_directory.is_empty() {
            cmd.arg("-c").arg(format!("cwd=\"{}\"", config.working_directory));
        }
        
        // 添加自定义参数
        if let Some(custom_args) = &config.custom_args {
            for arg in custom_args {
                cmd.arg(arg);
            }
        }
        
        // 打印要执行的命令用于调试
        tracing::info!("Starting codex with command: {:?}", cmd);
        
        let mut process = cmd
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        let stdin = process.stdin.take().expect("Failed to open stdin");
        let stdout = process.stdout.take().expect("Failed to open stdout");

        let (stdin_tx, mut stdin_rx) = mpsc::unbounded_channel::<String>();

        // 处理 stdin 写入
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

        // 处理 stdout 读取
        let app_clone = app.clone();
        let session_id_clone = session_id.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            
            tracing::info!("Starting stdout reader for session: {}", session_id_clone);
            
            while let Ok(Some(line)) = lines.next_line().await {
                tracing::debug!("Received line from codex: {}", line);
                if let Ok(event) = serde_json::from_str::<Event>(&line) {
                    tracing::debug!("Parsed event: {:?}", event);
                    // 发送事件到前端
                    if let Err(e) = app_clone.emit(&format!("codex-event-{}", session_id_clone), &event) {
                        tracing::error!("Failed to emit event: {}", e);
                    }
                } else {
                    tracing::warn!("Failed to parse codex event: {}", line);
                }
            }
            tracing::info!("Stdout reader terminated for session: {}", session_id_clone);
        });

        let client = Self {
            app: app.clone(),
            session_id,
            process,
            stdin_tx,
            config: config.clone(),
        };

        // 配置会话 - 暂时注释掉，使用 -c 参数预配置
        // client.configure_session().await?;

        Ok(client)
    }

    async fn configure_session(&mut self) -> Result<()> {
        let sandbox_policy = match self.config.sandbox_mode.as_str() {
            "read-only" => SandboxPolicy::ReadOnly,
            "workspace-write" => SandboxPolicy::WorkspaceWrite {
                writable_roots: vec![],
                network_access: false,
            },
            _ => SandboxPolicy::WorkspaceWrite {
                writable_roots: vec![],
                network_access: false,
            },
        };
        
        let provider = if self.config.use_oss {
            ModelProvider {
                name: "oss".to_string(),
                base_url: Some("http://localhost:11434/v1".to_string()),
            }
        } else {
            ModelProvider {
                name: self.config.provider.clone(),
                base_url: None,
            }
        };

        let submission = Submission {
            id: Uuid::new_v4().to_string(),
            op: Op::ConfigureSession {
                provider,
                model: self.config.model.clone(),
                model_reasoning_effort: "medium".to_string(),
                model_reasoning_summary: "concise".to_string(),
                user_instructions: None,
                base_instructions: None,
                approval_policy: self.config.approval_policy.clone(),
                sandbox_policy,
                disable_response_storage: false,
                cwd: PathBuf::from(&self.config.working_directory),
                resume_path: None,
            },
        };

        self.send_submission(submission).await
    }

    async fn send_submission(&self, submission: Submission) -> Result<()> {
        let json = serde_json::to_string(&submission)?;
        self.stdin_tx.send(json)?;
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

    pub async fn shutdown(&mut self) -> Result<()> {
        // 发送 shutdown 命令
        let submission = Submission {
            id: Uuid::new_v4().to_string(),
            op: Op::Shutdown,
        };
        
        if let Err(e) = self.send_submission(submission).await {
            tracing::warn!("Failed to send shutdown command: {}", e);
        }

        // 终止进程
        if let Err(e) = self.process.kill().await {
            tracing::warn!("Failed to kill codex process: {}", e);
        }

        Ok(())
    }
}