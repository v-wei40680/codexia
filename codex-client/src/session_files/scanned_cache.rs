use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedProject {
    pub name: String,
    pub path: String,
}

/// Read scanned projects from database
pub async fn read_scanned_projects() -> Result<Vec<ScannedProject>, String> {
    use crate::db::get_all_projects;

    let project_paths = get_all_projects()?;

    let projects: Vec<ScannedProject> = project_paths
        .into_iter()
        .map(|path| {
            let name = path
                .split('/')
                .last()
                .unwrap_or(&path)
                .to_string();
            ScannedProject { name, path }
        })
        .collect();

    Ok(projects)
}

/// Scan projects and update database
/// Uses incremental scanning: only scans files modified since last scan
pub async fn scan_and_cache_projects() -> Result<Vec<ScannedProject>, String> {
    use super::scanner::scan_projects;
    use crate::db::{get_all_projects, get_last_global_scan, update_last_global_scan};
    use std::collections::HashSet;

    // Get last global scan time from database
    let last_scan = get_last_global_scan()?;

    // Scan only files modified after last scan
    let scanned = scan_projects(last_scan).await?;

    // Get newly found project paths
    let new_project_paths: HashSet<String> = scanned
        .iter()
        .filter_map(|v| v["path"].as_str())
        .map(String::from)
        .collect();

    // If we found new projects, they'll be added to database via individual project scans
    // Here we just update the global scan time
    if !new_project_paths.is_empty() || last_scan.is_none() {
        update_last_global_scan()?;
    }

    // Get all projects from database (includes both old and newly scanned)
    let all_paths = get_all_projects()?;

    let projects: Vec<ScannedProject> = all_paths
        .into_iter()
        .map(|path| {
            let name = path
                .split('/')
                .last()
                .unwrap_or(&path)
                .to_string();
            ScannedProject { name, path }
        })
        .collect();

    Ok(projects)
}
