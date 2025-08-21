use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[allow(dead_code)]
pub fn get_sessions_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home_dir.join(".codex").join("sessions"))
}

#[allow(dead_code)]
pub fn scan_jsonl_files<P: AsRef<Path>>(dir_path: P) -> impl Iterator<Item = walkdir::DirEntry> {
    WalkDir::new(dir_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("jsonl"))
}

#[allow(dead_code)]
pub fn read_file_content<P: AsRef<Path>>(file_path: P) -> Result<String, String> {
    fs::read_to_string(&file_path)
        .map_err(|e| format!("Error reading file {:?}: {}", file_path.as_ref(), e))
}

#[allow(dead_code)]
pub fn remove_file<P: AsRef<Path>>(file_path: P) -> Result<(), String> {
    fs::remove_file(&file_path)
        .map_err(|e| format!("Failed to delete file '{:?}': {}", file_path.as_ref(), e))
}

#[allow(dead_code)]
pub fn get_file_modification_time<P: AsRef<Path>>(file_path: P) -> Option<std::time::SystemTime> {
    file_path.as_ref().metadata().ok()?.modified().ok()
}
