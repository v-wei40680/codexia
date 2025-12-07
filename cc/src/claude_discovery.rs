use std::path::PathBuf;

fn get_platform_binary_name() -> &'static str {
    "cli.js"
}

pub fn discover_claude_command() -> Option<PathBuf> {
    let home_dir = if cfg!(windows) {
        std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .unwrap_or_default()
    } else {
        std::env::var("HOME").unwrap_or_default()
    };
    let binary_name = get_platform_binary_name();

    // 0) Optional override via environment variable
    if let Ok(explicit) = std::env::var("CLAUDE_PATH") {
        let p = PathBuf::from(&explicit);
        if p.exists() {
            log::debug!("Using CLAUDE_PATH override at {}", p.display());
            return Some(p);
        } else {
            log::warn!("CLAUDE_PATH provided but not found: {}", explicit);
        }
    }

    // First priority: Check actual binary locations in node_modules
    let mut binary_locations = vec![
        // Bun global installation
        PathBuf::from(&home_dir)
            .join(".bun/install/global/node_modules/@anthropic-ai/claude-code")
            .join(binary_name),
        // NPM rootless (user) global installation
        PathBuf::from(&home_dir)
            .join(".local/share/npm/lib/node_modules/@anthropic-ai/claude-code")
            .join(binary_name),
        // NPM global installations
        PathBuf::from("/usr/local/lib/node_modules/@anthropic-ai/claude-code").join(binary_name),
        PathBuf::from("/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code").join(binary_name),
    ];

    // Add Windows npm global installation paths if applicable
    if cfg!(windows) {
        if let Ok(appdata) = std::env::var("APPDATA") {
            binary_locations.extend([
                PathBuf::from(&appdata).join("npm").join("claude.cmd"),
                PathBuf::from(&appdata).join("npm").join("claude.ps1"),
                PathBuf::from(&appdata).join("npm").join("claude"),
            ]);
        }
    }

    for path_buf in &binary_locations {
        if path_buf.exists() {
            log::debug!("Found claude binary at {}", path_buf.display());
            return Some(path_buf.clone());
        }
    }

    // Second priority: Check if there are native rust/cargo installations
    let native_paths = [
        PathBuf::from("/usr/local/bin/claude"),
        PathBuf::from("/opt/homebrew/bin/claude"),
    ];

    for path_buf in &native_paths {
        if path_buf.exists() {
            // Check if it's a real binary (not a js wrapper)
            if let Ok(content) = std::fs::read_to_string(path_buf) {
                if content.contains("cli.js") || content.starts_with("#!/usr/bin/env node") {
                    // This is a wrapper script, skip it
                    log::debug!("Skipping wrapper script at {}", path_buf.display());
                    continue;
                }
            }
            log::debug!("Found native claude binary at {}", path_buf.display());
            return Some(path_buf.clone());
        }
    }

    if let Ok(path_env) = std::env::var("PATH") {
        let separator = if cfg!(windows) { ';' } else { ':' };
        let mut wrapper_candidate: Option<PathBuf> = None;
        let candidate_names: &[&str] = if cfg!(windows) {
            &["claude.exe", "claude.cmd", "claude.ps1", "claude", "cli.js"]
        } else {
            &["claude", "cli.js"]
        };
        for dir in path_env.split(separator) {
            if dir.is_empty() {
                continue;
            }
            for name in candidate_names {
                let candidate = PathBuf::from(dir).join(name);
                if candidate.exists() {
                    if let Ok(content) = std::fs::read_to_string(&candidate) {
                        let is_wrapper = content.contains("cli.js")
                            || content.starts_with("#!/usr/bin/env node")
                            || content.contains("import");
                        if is_wrapper {
                            if wrapper_candidate.is_none() {
                                wrapper_candidate = Some(candidate.clone());
                                log::debug!("Found wrapper script candidate at {} (will use only if no native binary is found)", candidate.display());
                            }
                            continue;
                        }
                    }
                    log::debug!("Found claude in PATH at {}", candidate.display());
                    return Some(candidate);
                }
            }
        }
        if let Some(wrapper) = wrapper_candidate {
            log::debug!(
                "Using wrapper claude from PATH at {} as fallback",
                wrapper.display()
            );
            return Some(wrapper);
        }
    }

    log::warn!("No claude binary found in common locations or PATH");
    None
}
