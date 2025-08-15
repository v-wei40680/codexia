use anyhow::Result;
use tauri::{AppHandle, Emitter};
use tokio::process::Command;

use crate::protocol::CodexConfig;
use crate::utils::logger::log_to_file;
use crate::utils::codex_discovery::discover_codex_command;


pub struct CodexClient {
    app: AppHandle,
    session_id: String,
    config: CodexConfig,
}

impl CodexClient {
    pub async fn new(app: &AppHandle, session_id: String, config: CodexConfig) -> Result<Self> {
        log_to_file(&format!("Creating simple CodexClient for session: {}", session_id));
        
        Ok(Self {
            app: app.clone(),
            session_id,
            config,
        })
    }


    pub async fn send_user_input(&self, message: String) -> Result<()> {
        // Use simple command execution instead of complex protocol
        let (command, args): (String, Vec<String>) = if let Some(configured_path) = &self.config.codex_path {
            (configured_path.clone(), vec![])
        } else if let Some(path) = discover_codex_command() {
            (path.to_string_lossy().to_string(), vec![])
        } else {
            return Err(anyhow::anyhow!("Could not find codex executable"));
        };

        let mut cmd = Command::new(&command);
        
        // Add arguments
        if !args.is_empty() {
            cmd.args(&args);
        }

        // Use exec subcommand for non-interactive execution
        cmd.arg("exec");

        // For OSS mode
        if self.config.use_oss {
            cmd.arg("--oss");
            cmd.arg("-m").arg(&self.config.model);
        }
        
        // Set working directory
        if !self.config.working_directory.is_empty() {
            cmd.current_dir(&self.config.working_directory);
        }

        // Add the user message as argument
        cmd.arg(&message);
        
        log_to_file(&format!("Executing codex command: {:?}", cmd));
        
        // Execute and capture output
        let output = cmd.output().await?;
        
        // Send output back to frontend
        if let Ok(stdout) = String::from_utf8(output.stdout) {
            if !stdout.trim().is_empty() {
                log_to_file(&format!("Codex response: {}", stdout));
                // Emit the response back to frontend
                let _ = self.app.emit(&format!("codex-response:{}", self.session_id), stdout);
            }
        }
        
        // Also send stderr if there's any
        if let Ok(stderr) = String::from_utf8(output.stderr) {
            if !stderr.trim().is_empty() {
                log_to_file(&format!("Codex stderr: {}", stderr));
                let _ = self.app.emit(&format!("codex-error:{}", self.session_id), stderr);
            }
        }
        
        Ok(())
    }

    pub async fn send_exec_approval(&self, _approval_id: String, _approved: bool) -> Result<()> {
        // Simplified implementation - no complex protocol needed
        log_to_file("Exec approval not implemented in simplified mode");
        Ok(())
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        // Simplified implementation - no persistent process to shutdown
        log_to_file(&format!("Shutting down session: {}", self.session_id));
        Ok(())
    }
}
