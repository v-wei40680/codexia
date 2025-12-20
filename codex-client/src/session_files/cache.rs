use crate::db::{read_project_cache, write_project_cache};
use super::scanner::{scan_sessions_after, ScanResult};
use serde_json::{json, Value};
use std::collections::HashSet;

/// Main tauri command: load or refresh sessions for given project
pub async fn load_project_sessions(
    project_path: String,
    limit: Option<usize>,
    offset: Option<usize>,
    search_query: Option<String>,
) -> Result<Value, String> {
    let limit = limit.unwrap_or(20);
    let offset = offset.unwrap_or(0);
    let search_query = search_query.unwrap_or_default().trim().to_lowercase();

    match read_project_cache(&project_path)? {
        Some((last_scanned, mut cached_sessions, favorites)) => {
            // Incremental scan
            let ScanResult {
                sessions: mut new_sessions,
            } = scan_sessions_after(&project_path, Some(last_scanned))?;

            let new_ids: HashSet<String> = new_sessions
                .iter()
                .filter_map(|session| session["conversationId"].as_str().map(String::from))
                .collect();

            // Deduplicate by conversationId
            cached_sessions.retain(|s| {
                s["conversationId"]
                    .as_str()
                    .map(|id| !new_ids.contains(id))
                    .unwrap_or(true)
            });

            cached_sessions.append(&mut new_sessions);

            // Sort newest first
            cached_sessions.sort_by(|a, b| {
                use super::utils::extract_datetime;
                let a_dt = extract_datetime(a["path"].as_str().unwrap_or_default());
                let b_dt = extract_datetime(b["path"].as_str().unwrap_or_default());
                match (a_dt, b_dt) {
                    (Some(a_dt), Some(b_dt)) => b_dt.cmp(&a_dt),
                    (Some(_), None) => std::cmp::Ordering::Less,
                    (None, Some(_)) => std::cmp::Ordering::Greater,
                    (None, None) => a["path"].as_str().cmp(&b["path"].as_str()),
                }
            });

            write_project_cache(&project_path, &cached_sessions, &favorites)?;

            // Apply search filter
            let filtered_sessions: Vec<Value> = if search_query.is_empty() {
                cached_sessions
            } else {
                cached_sessions
                    .into_iter()
                    .filter(|session| {
                        session["preview"]
                            .as_str()
                            .unwrap_or("")
                            .to_lowercase()
                            .contains(&search_query)
                    })
                    .collect()
            };

            let total = filtered_sessions.len();
            let paginated_sessions: Vec<Value> = filtered_sessions
                .into_iter()
                .skip(offset)
                .take(limit)
                .collect();

            Ok(json!({
                "sessions": paginated_sessions,
                "favorites": favorites,
                "total": total,
                "hasMore": offset + paginated_sessions.len() < total,
            }))
        }
        None => {
            // No cache or broken cache → full scan
            let ScanResult { sessions } = scan_sessions_after(&project_path, None)?;
            let favorites: Vec<String> = Vec::new();

            write_project_cache(&project_path, &sessions, &favorites)?;

            // Apply search filter
            let filtered_sessions: Vec<Value> = if search_query.is_empty() {
                sessions
            } else {
                sessions
                    .into_iter()
                    .filter(|session| {
                        session["preview"]
                            .as_str()
                            .unwrap_or("")
                            .to_lowercase()
                            .contains(&search_query)
                    })
                    .collect()
            };

            let total = filtered_sessions.len();
            let paginated_sessions: Vec<Value> = filtered_sessions
                .into_iter()
                .skip(offset)
                .take(limit)
                .collect();

            Ok(json!({
                "sessions": paginated_sessions,
                "favorites": favorites,
                "total": total,
                "hasMore": offset + paginated_sessions.len() < total,
            }))
        }
    }
}
