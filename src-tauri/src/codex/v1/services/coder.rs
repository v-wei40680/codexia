use codex_finder::discover_coder_command;
use crate::codex::v1::utils::command::create_command;

pub async fn check_coder_version() -> Result<String, String> {
    let path = match discover_coder_command() {
        Some(p) => p.to_string_lossy().to_string(),
        None => "coder".to_string(),
    };
    println!("Discovered coder path: {}", path);

    let output = create_command(&path)
        .arg("-V")
        .output()
        .map_err(|e| format!("Failed to execute coder binary: {}", e))?;

    println!("Coder command output: {:?}", output);

    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(version)
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(format!("Coder binary returned error: {}", err_msg))
    }
}
