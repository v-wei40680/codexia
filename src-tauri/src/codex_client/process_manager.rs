use anyhow::Result;
use std::collections::HashMap;
use std::process::Stdio;
use tokio::io::AsyncWriteExt;
use tokio::process::{Child, Command};
use tokio::sync::mpsc;

use crate::protocol::CodexConfig;

pub struct ProcessManager {
    pub process: Option<Child>,
    pub stdin_tx: Option<mpsc::UnboundedSender<String>>,
}

impl ProcessManager {
    pub async fn start_process(
        mut cmd: Command,
        env_vars: HashMap<String, String>,
        config: &CodexConfig,
    ) -> Result<Self> {
        // Apply environment variables to the command
        for (key, value) in &env_vars {
            log::debug!("Setting environment variable: {}=***", key);
            cmd.env(key, value);
        }

        let mut process = cmd
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(&config.working_directory)
            .spawn()?;

        // Give the process a moment to start up and check if it's still running
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        if let Ok(Some(exit_status)) = process.try_wait() {
            return Err(anyhow::anyhow!(
                "Codex process exited immediately with status: {}. Check if the command and arguments are correct.", 
                exit_status
            ));
        }

        let stdin = process.stdin.take().expect("Failed to open stdin");
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

        Ok(Self {
            process: Some(process),
            stdin_tx: Some(stdin_tx),
        })
    }

    pub async fn terminate(&mut self) -> Result<()> {
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

        Ok(())
    }

    pub fn is_active(&self) -> bool {
        self.process.is_some() && self.stdin_tx.is_some()
    }

    pub fn send_to_stdin(&self, message: String) -> Result<()> {
        if let Some(stdin_tx) = &self.stdin_tx {
            stdin_tx.send(message)?;
        }
        Ok(())
    }
}
