use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedProject {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScannedProjectsCache {
    pub last_scan: DateTime<Utc>,
    pub projects: Vec<ScannedProject>,
}

/// Get the path to the scanned projects cache file
fn get_cache_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not get home directory")?;
    let codex_dir = home_dir.join(".codex");
    std::fs::create_dir_all(&codex_dir)
        .map_err(|e| format!("Failed to create .codex directory: {}", e))?;
    Ok(codex_dir.join("scanned_projects.json"))
}

/// Read scanned projects from cache
pub async fn read_scanned_projects() -> Result<Vec<ScannedProject>, String> {
    let cache_path = get_cache_path()?;

    if !cache_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&cache_path)
        .map_err(|e| format!("Failed to read scanned projects cache: {}", e))?;

    let cache: ScannedProjectsCache = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse scanned projects cache: {}", e))?;

    Ok(cache.projects)
}

/// Write scanned projects to cache
pub async fn write_scanned_projects(projects: Vec<ScannedProject>) -> Result<(), String> {
    let cache_path = get_cache_path()?;

    let cache = ScannedProjectsCache {
        last_scan: Utc::now(),
        projects,
    };

    let content = serde_json::to_string_pretty(&cache)
        .map_err(|e| format!("Failed to serialize scanned projects: {}", e))?;

    fs::write(&cache_path, content)
        .map_err(|e| format!("Failed to write scanned projects cache: {}", e))?;

    Ok(())
}

/// Scan projects and save to cache
pub async fn scan_and_cache_projects() -> Result<Vec<ScannedProject>, String> {
    use super::scanner::scan_projects;

    let scanned = scan_projects().await?;

    let projects: Vec<ScannedProject> = scanned
        .into_iter()
        .map(|v| {
            let path = v["path"].as_str().unwrap_or_default().to_string();
            let name = path
                .split('/')
                .last()
                .unwrap_or(&path)
                .to_string();

            ScannedProject { name, path }
        })
        .collect();

    write_scanned_projects(projects.clone()).await?;

    Ok(projects)
}
