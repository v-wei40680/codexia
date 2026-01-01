use anyhow::{anyhow, Context, Result};
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::process::Command;
use tokio::time::timeout;
use moka::future::Cache;

use crate::app_types::{AppType, format_skill_error};

/// Skill object
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    /// Unique identifier: "owner/name:directory" or "local:directory"
    pub key: String,
    /// Display name (parsed from SKILL.md)
    pub name: String,
    /// Skill description
    pub description: String,
    /// Directory name (last segment of installation path)
    pub directory: String,
    /// GitHub README URL
    #[serde(rename = "readmeUrl")]
    pub readme_url: Option<String>,
    /// Whether installed
    pub installed: bool,
    /// Repository owner
    #[serde(rename = "repoOwner")]
    pub repo_owner: Option<String>,
    /// Repository name
    #[serde(rename = "repoName")]
    pub repo_name: Option<String>,
    /// Branch name
    #[serde(rename = "repoBranch")]
    pub repo_branch: Option<String>,
}

/// Repository configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillRepo {
    /// GitHub user/organization name
    pub owner: String,
    /// Repository name
    pub name: String,
    /// Branch (default "main")
    pub branch: String,
    /// Whether enabled
    pub enabled: bool,
}

/// Skill installation state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillState {
    /// Whether installed
    pub installed: bool,
    /// Installation time
    #[serde(rename = "installedAt")]
    pub installed_at: DateTime<Utc>,
}

/// Persistent storage structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillStore {
    /// directory -> installation state
    pub skills: HashMap<String, SkillState>,
    /// Repository list
    pub repos: Vec<SkillRepo>,
}

impl Default for SkillStore {
    fn default() -> Self {
        SkillStore {
            skills: HashMap::new(),
            repos: vec![
                SkillRepo {
                    owner: "ComposioHQ".to_string(),
                    name: "awesome-claude-skills".to_string(),
                    branch: "main".to_string(),
                    enabled: true,
                },
                SkillRepo {
                    owner: "anthropics".to_string(),
                    name: "skills".to_string(),
                    branch: "main".to_string(),
                    enabled: true,
                },
                SkillRepo {
                    owner: "cexll".to_string(),
                    name: "myclaude".to_string(),
                    branch: "master".to_string(),
                    enabled: true,
                },
            ],
        }
    }
}

/// Skill metadata (parsed from SKILL.md)
#[derive(Debug, Clone, Deserialize)]
pub struct SkillMetadata {
    pub name: Option<String>,
    pub description: Option<String>,
}

// Global cache for repo skills with 5-minute TTL
static REPO_CACHE: OnceLock<Cache<String, Vec<Skill>>> = OnceLock::new();

fn get_repo_cache() -> &'static Cache<String, Vec<Skill>> {
    REPO_CACHE.get_or_init(|| {
        Cache::builder()
            .time_to_live(std::time::Duration::from_secs(300)) // 5 minutes
            .max_capacity(100)
            .build()
    })
}

// Check if git is available
fn is_git_available() -> bool {
    Command::new("git")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

pub struct SkillService {
    http_client: Client,
    install_dir: PathBuf,
}

impl SkillService {
    pub fn new_for_app(app_type: AppType) -> Result<Self> {
        let install_dir = Self::get_install_dir_for_app(&app_type)?;

        // Ensure directory exists
        fs::create_dir_all(&install_dir)?;

        Ok(Self {
            http_client: Client::builder()
                .user_agent("cc-switch")
                // Set timeout to 10 seconds to avoid long hangs from invalid links
                .timeout(std::time::Duration::from_secs(10))
                .build()?,
            install_dir,
        })
    }

    fn get_install_dir_for_app(app_type: &AppType) -> Result<PathBuf> {
        let home = dirs::home_dir().context(format_skill_error(
            "GET_HOME_DIR_FAILED",
            &[],
            Some("checkPermission"),
        ))?;

        // Ensure directory exists
        let dir = match app_type {
            AppType::Claude => home.join(".claude").join("skills"),
            AppType::Codex => home.join(".codex").join("skills"),
            AppType::Gemini => home.join(".gemini").join("skills"),
        };

        Ok(dir)
    }

    /// Get cached repo directory
    fn get_repo_cache_dir() -> Result<PathBuf> {
        let home = dirs::home_dir().context("Failed to get home directory")?;
        let cache_dir = home.join(".codexia").join("repo_cache");
        fs::create_dir_all(&cache_dir)?;
        Ok(cache_dir)
    }

    /// Get skill list cache file path
    fn get_skill_list_cache_path(repo: &SkillRepo) -> Result<PathBuf> {
        let cache_dir = Self::get_repo_cache_dir()?;
        Ok(cache_dir.join(format!("{}_{}_{}.json", repo.owner, repo.name, repo.branch)))
    }

    /// Load cached skill list from disk
    async fn load_cached_skill_list(&self, repo: &SkillRepo) -> Result<Vec<Skill>> {
        let cache_file = Self::get_skill_list_cache_path(repo)?;

        if !cache_file.exists() {
            return Err(anyhow!("Cache file not found"));
        }

        // Check if cache is stale (older than 1 hour)
        if let Ok(metadata) = fs::metadata(&cache_file) {
            if let Ok(modified) = metadata.modified() {
                if let Ok(elapsed) = modified.elapsed() {
                    if elapsed.as_secs() > 3600 {
                        return Err(anyhow!("Cache is stale"));
                    }
                }
            }
        }

        let content = fs::read_to_string(&cache_file)?;
        let skills: Vec<Skill> = serde_json::from_str(&content)?;
        Ok(skills)
    }

    /// Save skill list to disk cache
    async fn save_cached_skill_list(&self, repo: &SkillRepo, skills: &[Skill]) -> Result<()> {
        let cache_file = Self::get_skill_list_cache_path(repo)?;
        let content = serde_json::to_string(skills)?;
        fs::write(&cache_file, content)?;
        Ok(())
    }
}

// Core method implementations
impl SkillService {
    /// List all skills
    pub async fn list_skills(&self, repos: Vec<SkillRepo>) -> Result<Vec<Skill>> {
        let mut skills = Vec::new();

        // Only use enabled repositories, fetch in parallel to avoid single invalid repo slowing down overall refresh
        let enabled_repos: Vec<SkillRepo> = repos.into_iter().filter(|repo| repo.enabled).collect();

        let fetch_tasks = enabled_repos
            .iter()
            .map(|repo| self.fetch_repo_skills(repo));

        let results: Vec<Result<Vec<Skill>>> = futures::future::join_all(fetch_tasks).await;

        for (repo, result) in enabled_repos.into_iter().zip(results.into_iter()) {
            match result {
                Ok(repo_skills) => skills.extend(repo_skills),
                Err(e) => log::warn!("Failed to fetch skills from repo {}/{}: {}", repo.owner, repo.name, e),
            }
        }

        // Merge local skills
        self.merge_local_skills(&mut skills)?;

        // Deduplicate and sort
        Self::deduplicate_skills(&mut skills);
        skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(skills)
    }

    /// Fetch skill list from repository
    async fn fetch_repo_skills(&self, repo: &SkillRepo) -> Result<Vec<Skill>> {
        // Generate cache key
        let cache_key = format!("{}:{}:{}", repo.owner, repo.name, repo.branch);

        // Check memory cache first
        let cache = get_repo_cache();
        if let Some(cached_skills) = cache.get(&cache_key).await {
            log::debug!("Memory cache hit for repo {}/{}", repo.owner, repo.name);
            return Ok(cached_skills);
        }

        // Check disk cache (persisted skill list)
        if let Ok(cached_skills) = self.load_cached_skill_list(repo).await {
            log::debug!("Disk cache hit for repo {}/{}", repo.owner, repo.name);
            cache.insert(cache_key.clone(), cached_skills.clone()).await;
            return Ok(cached_skills);
        }

        log::debug!("Cache miss for repo {}/{}, downloading and scanning...", repo.owner, repo.name);

        // Add overall timeout for single repository loading to avoid long blocks from invalid links
        let temp_dir = timeout(std::time::Duration::from_secs(60), self.download_repo(repo))
            .await
            .map_err(|_| {
                anyhow!(format_skill_error(
                    "DOWNLOAD_TIMEOUT",
                    &[
                        ("owner", &repo.owner),
                        ("name", &repo.name),
                        ("timeout", "60")
                    ],
                    Some("checkNetwork"),
                ))
            })??;
        let mut skills = Vec::new();

        // Scan repository root directory (supports full repository recursive scan)
        let scan_dir = temp_dir.clone();

        // Recursively scan directories to find all skills
        self.scan_dir_recursive(&scan_dir, &scan_dir, repo, &mut skills)?;

        // Clean up temp directory if it's not from git cache
        if !temp_dir.starts_with(&Self::get_repo_cache_dir()?) {
            let _ = fs::remove_dir_all(&temp_dir);
        }

        // Save to disk cache
        let _ = self.save_cached_skill_list(repo, &skills).await;

        // Cache in memory
        cache.insert(cache_key, skills.clone()).await;

        Ok(skills)
    }

    /// Recursively scan directories to find SKILL.md
    ///
    /// Rules:
    /// 1. If the current directory contains SKILL.md, treat it as a skill and stop scanning its subdirectories (subdirectories are considered functional folders)
    /// 2. If the current directory does not contain SKILL.md, recursively scan all subdirectories
    fn scan_dir_recursive(
        &self,
        current_dir: &Path,
        base_dir: &Path,
        repo: &SkillRepo,
        skills: &mut Vec<Skill>,
    ) -> Result<()> {
        // Check whether the current directory contains SKILL.md
        let skill_md = current_dir.join("SKILL.md");

        if skill_md.exists() {
            // Skill found! Use the relative path as the directory name
            let directory = if current_dir == base_dir {
                // SKILL.md at the repository root, use the repository name
                repo.name.clone()
            } else {
                // SKILL.md in a subdirectory, use the relative path
                current_dir
                    .strip_prefix(base_dir)
                    .unwrap_or(current_dir)
                    .to_string_lossy()
                    .to_string()
            };

            if let Ok(skill) = self.build_skill_from_metadata(&skill_md, &directory, repo) {
                skills.push(skill);
            }

            // Stop scanning subdirectories of this directory (they are considered functional folders)
            return Ok(());
        }

        // SKILL.md not found, continue recursively scanning all subdirectories
        for entry in fs::read_dir(current_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                self.scan_dir_recursive(&path, base_dir, repo, skills)?;
            }
        }

        Ok(())
    }

    /// Build a Skill object from SKILL.md
    fn build_skill_from_metadata(
        &self,
        skill_md: &Path,
        directory: &str,
        repo: &SkillRepo,
    ) -> Result<Skill> {
        let meta = self.parse_skill_metadata(skill_md)?;

        // build README URL
        let readme_path = directory.to_string();

        Ok(Skill {
            key: format!("{}/{}:{}", repo.owner, repo.name, directory),
            name: meta.name.unwrap_or_else(|| directory.to_string()),
            description: meta.description.unwrap_or_default(),
            directory: directory.to_string(),
            readme_url: Some(format!(
                "https://github.com/{}/{}/tree/{}/{}",
                repo.owner, repo.name, repo.branch, readme_path
            )),
            installed: false,
            repo_owner: Some(repo.owner.clone()),
            repo_name: Some(repo.name.clone()),
            repo_branch: Some(repo.branch.clone()),
        })
    }

    /// Parse skill metadata
    fn parse_skill_metadata(&self, path: &Path) -> Result<SkillMetadata> {
        let content = fs::read_to_string(path)?;

        // Remove BOM
        let content = content.trim_start_matches('\u{feff}');

        // Extract YAML front matter
        let parts: Vec<&str> = content.splitn(3, "---").collect();
        if parts.len() < 3 {
            return Ok(SkillMetadata {
                name: None,
                description: None,
            });
        }

        let front_matter = parts[1].trim();
        let meta: SkillMetadata = serde_yaml::from_str(front_matter).unwrap_or(SkillMetadata {
            name: None,
            description: None,
        });

        Ok(meta)
    }

    /// Merge local skills
    fn merge_local_skills(&self, skills: &mut Vec<Skill>) -> Result<()> {
        if !self.install_dir.exists() {
            return Ok(());
        }

        // Collect all local skills
        let mut local_skills = Vec::new();
        self.scan_local_dir_recursive(&self.install_dir, &self.install_dir, &mut local_skills)?;

        // Process found local skills
        for local_skill in local_skills {
            let directory = &local_skill.directory;

            // Update installed state (match against remote skills)
            // Compare using the last path segment, since only the last segment is used as the install directory name
            let mut found = false;
            let local_install_name = Path::new(directory)
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| directory.clone());

            for skill in skills.iter_mut() {
                let remote_install_name = Path::new(&skill.directory)
                    .file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_else(|| skill.directory.clone());

                if remote_install_name.eq_ignore_ascii_case(&local_install_name) {
                    skill.installed = true;
                    found = true;
                    break;
                }
            }

            // Add local-only skills (only if not found in repositories)
            if !found {
                skills.push(local_skill);
            }
        }

        Ok(())
    }

    /// Recursively scan local directories to find SKILL.md
    fn scan_local_dir_recursive(
        &self,
        current_dir: &Path,
        base_dir: &Path,
        skills: &mut Vec<Skill>,
    ) -> Result<()> {
        // Check whether the current directory contains SKILL.md
        let skill_md = current_dir.join("SKILL.md");

        if skill_md.exists() {
            // Skill found! Use the relative path as the directory name
            let directory = if current_dir == base_dir {
                // If this is the install_dir itself, use the last path segment
                current_dir
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string()
            } else {
                // Use the path relative to install_dir
                current_dir
                    .strip_prefix(base_dir)
                    .unwrap_or(current_dir)
                    .to_string_lossy()
                    .to_string()
            };

            // Parse metadata and create a local Skill object
            if let Ok(meta) = self.parse_skill_metadata(&skill_md) {
                skills.push(Skill {
                    key: format!("local:{directory}"),
                    name: meta.name.unwrap_or_else(|| directory.clone()),
                    description: meta.description.unwrap_or_default(),
                    directory: directory.clone(),
                    readme_url: None,
                    installed: true,
                    repo_owner: None,
                    repo_name: None,
                    repo_branch: None,
                });
            }

            // Stop scanning subdirectories of this directory (they are considered functional folders)
            return Ok(());
        }

        // SKILL.md not found, continue recursively scanning all subdirectories
        for entry in fs::read_dir(current_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                self.scan_local_dir_recursive(&path, base_dir, skills)?;
            }
        }

        Ok(())
    }

    /// Deduplicate skill list
    /// Use the full key (owner/name:directory) to distinguish skills with the same name from different repositories
    fn deduplicate_skills(skills: &mut Vec<Skill>) {
        let mut seen = HashMap::new();
        skills.retain(|skill| {
            // Using the complete key instead of just the directory allows skills with the same name from different repositories to coexist.
            let unique_key = skill.key.to_lowercase();
            if let std::collections::hash_map::Entry::Vacant(e) = seen.entry(unique_key) {
                e.insert(true);
                true
            } else {
                false
            }
        });
    }

    /// Download repository (prefer git clone, fallback to ZIP)
    async fn download_repo(&self, repo: &SkillRepo) -> Result<PathBuf> {
        // Try git clone first if git is available
        if is_git_available() {
            match self.download_repo_with_git(repo).await {
                Ok(path) => return Ok(path),
                Err(e) => {
                    log::warn!("Git clone failed, falling back to ZIP download: {}", e);
                }
            }
        }

        // Fallback to ZIP download
        self.download_repo_with_zip(repo).await
    }

    /// Download repository using git clone to cache directory
    async fn download_repo_with_git(&self, repo: &SkillRepo) -> Result<PathBuf> {
        let cache_dir = Self::get_repo_cache_dir()?;
        let repo_dir = cache_dir.join(format!("{}_{}", repo.owner, repo.name));

        if repo_dir.exists() {
            // Check if repo was recently accessed (within last hour)
            if let Ok(metadata) = fs::metadata(&repo_dir) {
                if let Ok(modified) = metadata.modified() {
                    if let Ok(elapsed) = modified.elapsed() {
                        if elapsed.as_secs() < 3600 {
                            // Accessed within last hour, use cached version
                            log::debug!("Using cached repo (updated {} seconds ago): {}/{}",
                                elapsed.as_secs(), repo.owner, repo.name);
                            return Ok(repo_dir);
                        }
                    }
                }
            }

            // Older than 1 hour, try to update
            log::debug!("Updating existing repo: {}/{}", repo.owner, repo.name);
            let output = Command::new("git")
                .arg("-C")
                .arg(&repo_dir)
                .arg("pull")
                .arg("--depth")
                .arg("1")
                .output()?;

            if !output.status.success() {
                // Pull failed, remove and re-clone
                log::warn!("Git pull failed, re-cloning...");
                fs::remove_dir_all(&repo_dir)?;
            } else {
                return Ok(repo_dir);
            }
        }

        // Clone new repository
        log::debug!("Cloning repo: {}/{}", repo.owner, repo.name);
        let url = format!("https://github.com/{}/{}.git", repo.owner, repo.name);
        let branch = if repo.branch.is_empty() {
            "main"
        } else {
            &repo.branch
        };

        let output = Command::new("git")
            .arg("clone")
            .arg("--depth")
            .arg("1")
            .arg("--branch")
            .arg(branch)
            .arg(&url)
            .arg(&repo_dir)
            .output()?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow!("Git clone failed: {}", error));
        }

        Ok(repo_dir)
    }

    /// Download repository using ZIP (fallback method)
    async fn download_repo_with_zip(&self, repo: &SkillRepo) -> Result<PathBuf> {
        let temp_dir = tempfile::tempdir()?;
        let temp_path = temp_dir.path().to_path_buf();
        let _ = temp_dir.keep(); // Keep temp directory for later manual cleanup

        // Try multiple branches
        let branches = if repo.branch.is_empty() {
            vec!["main", "master"]
        } else {
            vec![repo.branch.as_str(), "main", "master"]
        };

        let mut last_error = None;
        for branch in branches {
            let url = format!(
                "https://github.com/{}/{}/archive/refs/heads/{}.zip",
                repo.owner, repo.name, branch
            );

            match self.download_and_extract(&url, &temp_path).await {
                Ok(_) => {
                    return Ok(temp_path);
                }
                Err(e) => {
                    last_error = Some(e);
                    continue;
                }
            }
        }

        Err(last_error.unwrap_or_else(|| anyhow::anyhow!("All branches failed to download")))
    }

    /// Download and extract ZIP
    async fn download_and_extract(&self, url: &str, dest: &Path) -> Result<()> {
        // Download ZIP
        let response = self.http_client.get(url).send().await?;
        if !response.status().is_success() {
            let status = response.status().as_u16().to_string();
            return Err(anyhow::anyhow!(format_skill_error(
                "DOWNLOAD_FAILED",
                &[("status", &status)],
                match status.as_str() {
                    "403" => Some("http403"),
                    "404" => Some("http404"),
                    "429" => Some("http429"),
                    _ => Some("checkNetwork"),
                },
            )));
        }

        let bytes = response.bytes().await?;

        // Extract
        let cursor = std::io::Cursor::new(bytes);
        let mut archive = zip::ZipArchive::new(cursor)?;

        // Get root directory name (GitHub ZIPs contain a root directory)
        let root_name = if !archive.is_empty() {
            let first_file = archive.by_index(0)?;
            let name = first_file.name();
            name.split('/').next().unwrap_or("").to_string()
        } else {
            return Err(anyhow::anyhow!(format_skill_error(
                "EMPTY_ARCHIVE",
                &[],
                Some("checkRepoUrl"),
            )));
        };

        // Extract all files
        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let file_path = file.name();

            // Skip the root directory and extract the content directly.
            let relative_path =
                if let Some(stripped) = file_path.strip_prefix(&format!("{root_name}/")) {
                    stripped
                } else {
                    continue;
                };

            if relative_path.is_empty() {
                continue;
            }

            let outpath = dest.join(relative_path);

            if file.is_dir() {
                fs::create_dir_all(&outpath)?;
            } else {
                if let Some(parent) = outpath.parent() {
                    fs::create_dir_all(parent)?;
                }
                let mut outfile = fs::File::create(&outpath)?;
                std::io::copy(&mut file, &mut outfile)?;
            }
        }

        Ok(())
    }

    /// Install a skill (only handles downloading and file operations; state updates are handled by upper layers)
    pub async fn install_skill(&self, directory: String, repo: SkillRepo) -> Result<()> {
        // Use the last segment of the skill directory as the install directory name to avoid nested paths
        // For example: "skills/codex" -> "codex"
        let install_name = Path::new(&directory)
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| directory.clone());

        let dest = self.install_dir.join(&install_name);

        // If the destination directory already exists, treat it as installed and avoid re-downloading
        if dest.exists() {
            return Ok(());
        }

        // Add an overall timeout when downloading the repository to avoid long hangs caused by invalid links
        let temp_dir = timeout(
            std::time::Duration::from_secs(60),
            self.download_repo(&repo),
        )
        .await
        .map_err(|_| {
            anyhow!(format_skill_error(
                "DOWNLOAD_TIMEOUT",
                &[
                    ("owner", &repo.owner),
                    ("name", &repo.name),
                    ("timeout", "60")
                ],
                Some("checkNetwork"),
            ))
        })??;

        // Determine the source directory path (skill path relative to the repository root)
        let source = temp_dir.join(&directory);

        if !source.exists() {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(anyhow::anyhow!(format_skill_error(
                "SKILL_DIR_NOT_FOUND",
                &[("path", &source.display().to_string())],
                Some("checkRepoUrl"),
            )));
        }

        // Remove old version
        if dest.exists() {
            fs::remove_dir_all(&dest)?;
        }

        // Recursively copy
        Self::copy_dir_recursive(&source, &dest)?;

        // Clean up temporary directory
        let _ = fs::remove_dir_all(&temp_dir);

        Ok(())
    }

    /// Recursively copy a directory
    fn copy_dir_recursive(src: &Path, dest: &Path) -> Result<()> {
        fs::create_dir_all(dest)?;

        for entry in fs::read_dir(src)? {
            let entry = entry?;
            let path = entry.path();
            let dest_path = dest.join(entry.file_name());

            if path.is_dir() {
                Self::copy_dir_recursive(&path, &dest_path)?;
            } else {
                fs::copy(&path, &dest_path)?;
            }
        }

        Ok(())
    }

    /// Uninstall a skill (only handles file operations; state updates are handled by upper layers)
    pub fn uninstall_skill(&self, directory: String) -> Result<()> {
        // Use the last section of the skill directory as the installation directory name, consistent with `install_skill`.
        let install_name = Path::new(&directory)
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| directory.clone());

        let dest = self.install_dir.join(&install_name);

        if dest.exists() {
            fs::remove_dir_all(&dest)?;
        }

        Ok(())
    }
}
