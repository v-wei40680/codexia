use std::fs;

pub fn get_projects() -> Result<Vec<String>, String> {
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let claude_json = home.join(".claude.json");

    let content = fs::read_to_string(&claude_json)
        .map_err(|e| format!("Failed to read .claude.json: {}", e))?;

    let data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse .claude.json: {}", e))?;

    let projects = data.get("projects")
        .and_then(|p| p.as_object())
        .ok_or("No projects found in .claude.json")?;

    Ok(projects.keys().cloned().collect())
}
