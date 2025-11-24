use log::{info, warn};

#[cfg(target_os = "macos")]
use std::process::Command;

#[tauri::command]
pub async fn set_system_env(key: String, value: String) -> Result<(), String> {
    let normalized_key = key.trim().to_string();
    if normalized_key.is_empty() {
        return Err("Environment variable key cannot be empty.".to_string());
    }

    std::env::set_var(&normalized_key, &value);
    info!("Set environment variable {}", normalized_key);

    #[cfg(target_os = "macos")]
    {
        if let Err(err) = Command::new("launchctl")
            .args(["setenv", &normalized_key, &value])
            .status()
        {
            warn!(
                "Failed to run launchctl setenv for {}: {err}",
                normalized_key
            );
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_system_env(key: String) -> Result<Option<String>, String> {
    let normalized_key = key.trim().to_string();
    if normalized_key.is_empty() {
        return Err("Environment variable key cannot be empty.".to_string());
    }

    Ok(std::env::var(normalized_key).ok())
}
