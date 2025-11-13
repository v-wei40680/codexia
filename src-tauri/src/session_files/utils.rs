use chrono::{DateTime, Utc};
use chrono::NaiveDateTime;
use regex::Regex;
use serde_json::Value;
use std::fs::File;
use std::io::{self, BufRead, BufReader};
use std::path::PathBuf;

pub fn count_lines(file_path: &PathBuf) -> io::Result<usize> {
    let file = File::open(file_path)?;
    let reader = BufReader::new(file);
    Ok(reader.lines().count())
}

pub fn extract_datetime(path_str: &str) -> Option<NaiveDateTime> {
    let parts: Vec<&str> = path_str.split('/').collect();
    if parts.len() < 5 {
        return None;
    }
    let year = parts[parts.len() - 4];
    let month = parts[parts.len() - 3];
    let day = parts[parts.len() - 2];
    let filename = parts.last().unwrap_or(&"");
    let time_part = filename
        .split('T')
        .nth(1)
        .and_then(|s| Some(s.split('-').take(3).collect::<Vec<_>>().join("-")))
        .unwrap_or_default();
    let datetime_str = format!("{}-{}-{}T{}", year, month, day, time_part);
    NaiveDateTime::parse_from_str(&datetime_str, "%Y-%m-%dT%H-%M-%S").ok()
}

pub fn parse_session_project_path(line: &str) -> Option<String> {
    if let Ok(value) = serde_json::from_str::<Value>(line) {
        if let Some(cwd) = value["payload"]["cwd"].as_str() {
            return Some(cwd.to_string());
        }
    }
    None
}

pub fn parse_filename_metadata(file_name: &str) -> Result<(DateTime<Utc>, String), String> {
    let re = Regex::new(
        r"(?P<date>\d{4}-\d{2}-\d{2})T(?P<hour>\d{2})-(?P<min>\d{2})-(?P<sec>\d{2})-.*?(?P<uuid>[0-9a-fA-F\-]{36})"
    ).unwrap();

    let caps = re.captures(file_name)
        .ok_or_else(|| format!("Invalid filename: {}", file_name))?;

    let ts = format!(
        "{}T{}:{}:{}Z",
        &caps["date"], &caps["hour"], &caps["min"], &caps["sec"]
    );

    let dt = DateTime::parse_from_rfc3339(&ts)
        .map_err(|e| format!("Invalid timestamp {}: {}", ts, e))?
        .with_timezone(&Utc);

    Ok((dt, caps["uuid"].to_string()))
}
