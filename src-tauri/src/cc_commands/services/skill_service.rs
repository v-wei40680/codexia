use std::fs;

pub fn get_installed_skills() -> Result<Vec<String>, String> {
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let skills_dir = home.join(".claude").join("skills");

    if !skills_dir.exists() {
        return Ok(vec![]);
    }

    let mut skills = Vec::new();

    for entry in
        fs::read_dir(&skills_dir).map_err(|e| format!("Failed to read skills dir: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            // Check if SKILL.md exists
            if path.join("SKILL.md").exists() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    skills.push(name.to_string());
                }
            }
        }
    }

    skills.sort();
    Ok(skills)
}
