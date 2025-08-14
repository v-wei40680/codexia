use anyhow::Result;
use calamine::{open_workbook, Data, Reader as CalamineReader, Xlsx};
use csv::Reader;
use pdf_extract::extract_text;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub extension: Option<String>,
}

#[tauri::command]
pub async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let expanded_path = if path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&path[2..])
    } else {
        Path::new(&path).to_path_buf()
    };

    if !expanded_path.exists() || !expanded_path.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let mut entries = Vec::new();

    match fs::read_dir(&expanded_path) {
        Ok(dir_entries) => {
            for entry in dir_entries {
                match entry {
                    Ok(entry) => {
                        let path = entry.path();
                        let name = path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("Unknown")
                            .to_string();

                        let is_directory = path.is_dir();
                        let size = if is_directory {
                            None
                        } else {
                            fs::metadata(&path).ok().map(|m| m.len())
                        };

                        let extension = if is_directory {
                            None
                        } else {
                            path.extension()
                                .and_then(|ext| ext.to_str())
                                .map(|s| s.to_string())
                        };

                        entries.push(FileEntry {
                            name,
                            path: path.to_string_lossy().to_string(),
                            is_directory,
                            size,
                            extension,
                        });
                    }
                    Err(_) => continue,
                }
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }

    // Sort directories first, then files
    entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

#[tauri::command]
pub async fn get_default_directories() -> Result<Vec<String>, String> {
    let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;

    let default_dirs = vec![
        home.to_string_lossy().to_string(),
        home.join("Documents").to_string_lossy().to_string(),
        home.join("Downloads").to_string_lossy().to_string(),
        home.join("Pictures").to_string_lossy().to_string(),
        home.join("Movies").to_string_lossy().to_string(),
        home.join("Music").to_string_lossy().to_string(),
    ];

    Ok(default_dirs)
}

#[tauri::command]
pub async fn read_file(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }

    // Check file size to prevent reading very large files
    if let Ok(metadata) = fs::metadata(&expanded_path) {
        if metadata.len() > 1024 * 1024 {
            // 1MB limit
            return Err("File is too large to display".to_string());
        }
    }

    match fs::read_to_string(&expanded_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

#[tauri::command]
pub async fn write_file(file_path: String, content: String) -> Result<(), String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    // Basic safety check: only allow writing to text files
    let extension = expanded_path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase());

    let is_text_file = match extension.as_deref() {
        Some("txt") | Some("md") | Some("json") | Some("xml") | Some("yaml") | Some("yml")
        | Some("js") | Some("jsx") | Some("ts") | Some("tsx") | Some("rs") | Some("py")
        | Some("java") | Some("cpp") | Some("c") | Some("h") | Some("css") | Some("html")
        | Some("toml") | Some("cfg") | Some("ini") | Some("sh") | Some("log") => true,
        _ => false,
    };

    if !is_text_file {
        return Err("Only text files can be edited".to_string());
    }

    match fs::write(&expanded_path, content) {
        Ok(()) => Ok(()),
        Err(e) => Err(format!("Failed to write file: {}", e)),
    }
}

#[tauri::command]
pub async fn read_pdf_content(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }

    match extract_text(&expanded_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to extract PDF content: {}", e)),
    }
}

#[tauri::command]
pub async fn read_csv_content(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }

    let file = std::fs::File::open(expanded_path)
        .map_err(|e| format!("Failed to open CSV file: {}", e))?;

    let mut reader = Reader::from_reader(file);
    let mut content = String::new();

    // Read headers if they exist
    if let Ok(headers) = reader.headers() {
        content.push_str(&headers.iter().collect::<Vec<_>>().join(","));
        content.push('\n');
    }

    // Read all records
    for (i, result) in reader.records().enumerate() {
        if i >= 1000 {
            // Limit to first 1000 rows for performance
            content.push_str(&format!("... (truncated at {} rows)\n", i));
            break;
        }

        match result {
            Ok(record) => {
                content.push_str(&record.iter().collect::<Vec<_>>().join(","));
                content.push('\n');
            }
            Err(e) => {
                content.push_str(&format!("Error reading row {}: {}\n", i, e));
            }
        }
    }

    Ok(content)
}

#[tauri::command]
pub async fn read_xlsx_content(file_path: String) -> Result<String, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() || expanded_path.is_dir() {
        return Err("File does not exist or is a directory".to_string());
    }

    let mut workbook: Xlsx<_> =
        open_workbook(&expanded_path).map_err(|e| format!("Failed to open XLSX file: {}", e))?;

    let mut content = String::new();

    // Get the first worksheet
    let sheet_names = workbook.sheet_names().to_owned();
    if sheet_names.is_empty() {
        return Err("No worksheets found in XLSX file".to_string());
    }

    let sheet_name = &sheet_names[0];
    content.push_str(&format!("Sheet: {}\n\n", sheet_name));

    if let Ok(range) = workbook.worksheet_range(sheet_name) {
        let mut row_count = 0;
        for row in range.rows() {
            if row_count >= 1000 {
                // Limit to first 1000 rows for performance
                content.push_str(&format!("... (truncated at {} rows)\n", row_count));
                break;
            }

            let row_data: Vec<String> = row
                .iter()
                .map(|cell| match cell {
                    Data::Empty => String::new(),
                    Data::String(s) => s.clone(),
                    Data::Float(f) => f.to_string(),
                    Data::Int(i) => i.to_string(),
                    Data::Bool(b) => b.to_string(),
                    Data::Error(e) => format!("Error: {:?}", e),
                    Data::DateTime(dt) => format!("{}", dt),
                    Data::DateTimeIso(dt) => dt.clone(),
                    Data::DurationIso(d) => d.clone(),
                })
                .collect();

            content.push_str(&row_data.join("\t"));
            content.push('\n');
            row_count += 1;
        }
    }

    Ok(content)
}

#[tauri::command]
pub async fn calculate_file_tokens(file_path: String) -> Result<Option<u32>, String> {
    let path = Path::new(&file_path);

    if !path.exists() || path.is_dir() {
        return Ok(None);
    }

    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase());

    // Only calculate tokens for text, image, audio, and document files
    let is_supported = match extension.as_deref() {
        Some("txt") | Some("md") | Some("rs") | Some("js") | Some("ts") | Some("tsx")
        | Some("jsx") | Some("py") | Some("java") | Some("cpp") | Some("c") | Some("h")
        | Some("css") | Some("html") | Some("json") | Some("xml") | Some("yaml") | Some("yml")
        | Some("toml") | Some("cfg") | Some("ini") | Some("sh") | Some("png") | Some("jpg")
        | Some("jpeg") | Some("gif") | Some("webp") | Some("mp3") | Some("wav") | Some("flac")
        | Some("ogg") | Some("pdf") | Some("csv") | Some("xlsx") => true,
        _ => false,
    };

    if !is_supported {
        return Ok(None);
    }

    // For now, return a simple estimation based on file size
    // In a real implementation, you would use tiktoken-rs here
    match fs::metadata(path) {
        Ok(metadata) => {
            let size = metadata.len();
            // Rough estimation: ~4 characters per token for text files
            let estimated_tokens = match extension.as_deref() {
                Some("png") | Some("jpg") | Some("jpeg") | Some("gif") | Some("webp") => {
                    // Image tokens estimation (very rough)
                    (size / 1000) as u32 + 100
                }
                Some("mp3") | Some("wav") | Some("flac") | Some("ogg") => {
                    // Audio tokens estimation (very rough)
                    (size / 10000) as u32 + 50
                }
                Some("pdf") => {
                    // PDF tokens estimation (rough, based on compressed text)
                    (size / 8) as u32 + 100
                }
                Some("csv") => {
                    // CSV tokens estimation (similar to text but more structured)
                    (size / 5) as u32
                }
                Some("xlsx") => {
                    // XLSX tokens estimation (compressed format)
                    (size / 15) as u32 + 200
                }
                _ => {
                    // Text files
                    (size / 4) as u32
                }
            };
            Ok(Some(estimated_tokens))
        }
        Err(_) => Ok(None),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitDiff {
    pub original_content: String,
    pub current_content: String,
    pub has_changes: bool,
}

#[tauri::command]
pub async fn get_git_file_diff(file_path: String) -> Result<GitDiff, String> {
    let expanded_path = if file_path.starts_with("~/") {
        let home = dirs::home_dir().ok_or_else(|| "Cannot find home directory".to_string())?;
        home.join(&file_path[2..])
    } else {
        Path::new(&file_path).to_path_buf()
    };

    if !expanded_path.exists() {
        return Err("File does not exist".to_string());
    }

    // Get current file content
    let current_content = match fs::read_to_string(&expanded_path) {
        Ok(content) => content,
        Err(e) => return Err(format!("Failed to read current file: {}", e)),
    };

    // First check if we're in a git repository
    let git_check = Command::new("git")
        .arg("rev-parse")
        .arg("--is-inside-work-tree")
        .current_dir(&expanded_path.parent().unwrap_or_else(|| Path::new(".")))
        .output();

    let in_git_repo = match git_check {
        Ok(output) => output.status.success(),
        Err(_) => false,
    };

    if !in_git_repo {
        return Ok(GitDiff {
            original_content: String::new(),
            current_content,
            has_changes: false,
        });
    }

    // Use git diff to get the original content from the index/HEAD
    let git_show_output = Command::new("git")
        .arg("show")
        .arg(&format!(
            "HEAD:{}",
            expanded_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
        ))
        .current_dir(&expanded_path.parent().unwrap_or_else(|| Path::new(".")))
        .output();

    // If that fails, try with the full relative path
    let output = if git_show_output.is_err() || !git_show_output.as_ref().unwrap().status.success()
    {
        // Get git root and calculate relative path
        let git_root_output = Command::new("git")
            .arg("rev-parse")
            .arg("--show-toplevel")
            .current_dir(&expanded_path.parent().unwrap_or_else(|| Path::new(".")))
            .output();

        match git_root_output {
            Ok(root_output) if root_output.status.success() => {
                let git_root_string = String::from_utf8_lossy(&root_output.stdout);
                let git_root = git_root_string.trim();
                let git_root_path = Path::new(git_root);

                if let Ok(rel_path) = expanded_path.strip_prefix(git_root_path) {
                    Command::new("git")
                        .arg("show")
                        .arg(&format!("HEAD:{}", rel_path.to_string_lossy()))
                        .current_dir(git_root_path)
                        .output()
                } else {
                    git_show_output
                }
            }
            _ => git_show_output,
        }
    } else {
        git_show_output
    };

    let original_content = match output {
        Ok(output) => {
            if output.status.success() {
                String::from_utf8_lossy(&output.stdout).to_string()
            } else {
                // If git show fails, it might be a new file or not in git
                String::new()
            }
        }
        Err(_) => {
            // Git not available or not a git repo
            return Ok(GitDiff {
                original_content: current_content.clone(),
                current_content,
                has_changes: false,
            });
        }
    };

    let has_changes = original_content != current_content;

    Ok(GitDiff {
        original_content,
        current_content,
        has_changes,
    })
}
