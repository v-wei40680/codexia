use std::path::PathBuf;

/// Get application config directory
pub fn get_app_config_dir() -> PathBuf {
    dirs::config_dir()
        .expect("Failed to get config directory")
        .join("codexia")
}
