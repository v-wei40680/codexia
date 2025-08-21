use chrono::{DateTime, Utc};

#[allow(dead_code)]
pub fn parse_timestamp(timestamp_str: &str) -> Result<i64, String> {
    DateTime::parse_from_rfc3339(timestamp_str)
        .map(|dt| dt.timestamp_millis())
        .map_err(|e| format!("Failed to parse timestamp '{}': {}", timestamp_str, e))
}

#[allow(dead_code)]
pub fn current_timestamp_millis() -> i64 {
    Utc::now().timestamp_millis()
}

#[allow(dead_code)]
pub fn format_timestamp(timestamp_millis: i64) -> String {
    let dt = DateTime::from_timestamp_millis(timestamp_millis).unwrap_or_else(|| Utc::now());
    dt.to_rfc3339()
}
