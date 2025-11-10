use std::process::Command;
use tauri::command;

#[command]
pub fn open_terminal_with_command(command: String, cwd: Option<String>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut cmd = Command::new("powershell");
        if let Some(dir) = cwd {
            cmd.current_dir(dir);
        }
        cmd.args(["-NoExit", "-Command", &command])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        let cmd_string = if let Some(dir) = cwd {
            format!("cd {} && {}", dir, command)
        } else {
            command
        };
        Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "tell application \"Terminal\" to do script \"{}\"",
                cmd_string
            ))
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        let mut cmd = Command::new("gnome-terminal");
        if let Some(dir) = cwd {
            cmd.current_dir(dir);
        }
        cmd.args(["--", "bash", "-c", &format!("{command}; exec bash")])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}