use glob::glob;
use std::io::{Cursor, Read};
use std::{env, fs};
use zip::ZipArchive;

const APP_NAME: &str = env!("CARGO_PKG_NAME");

pub async fn load_manifests() -> Result<serde_json::Value, String> {
    async {
        let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Cannot find home directory"))?;
        let base_path = home.join(".config").join(APP_NAME).join("dxt");
        let pattern = base_path.join("*/*/manifest.json");

        let mut manifests = serde_json::Map::new();

        if base_path.exists() {
            for entry in glob(pattern.to_str().unwrap())? {
                let path = entry?;
                let parent_dir = path
                    .parent()
                    .ok_or_else(|| anyhow::anyhow!("Invalid path"))?;
                let repo = parent_dir
                    .file_name()
                    .ok_or_else(|| anyhow::anyhow!("Invalid path"))?
                    .to_string_lossy()
                    .to_string();

                let user_dir = parent_dir
                    .parent()
                    .ok_or_else(|| anyhow::anyhow!("Invalid path"))?;
                let user = user_dir
                    .file_name()
                    .ok_or_else(|| anyhow::anyhow!("Invalid path"))?
                    .to_string_lossy()
                    .to_string();

                let content = tokio::fs::read_to_string(&path).await?;
                let json: serde_json::Value = serde_json::from_str(&content)?;
                manifests.insert(format!("{}/{}", user, repo), json);
            }
        }

        Ok(serde_json::Value::Array(manifests.into_values().collect()))
    }
    .await
    .map_err(|e: anyhow::Error| e.to_string())
}

pub async fn load_manifest(user: String, repo: String) -> Result<serde_json::Value, String> {
    async {
        let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Cannot find home directory"))?;
        let manifest_path = home
            .join(".config")
            .join(APP_NAME)
            .join("dxt")
            .join(&user)
            .join(&repo)
            .join("manifest.json");

        if !manifest_path.exists() {
            return Err(anyhow::anyhow!("Manifest not found for {}/{}", user, repo));
        }

        let content = tokio::fs::read_to_string(&manifest_path).await?;
        let json: serde_json::Value = serde_json::from_str(&content)?;
        Ok(json)
    }
    .await
    .map_err(|e: anyhow::Error| e.to_string())
}

pub async fn read_dxt_setting(user: String, repo: String) -> Result<serde_json::Value, String> {
    async {
        let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Cannot find home directory"))?;
        let settings_dir = home.join(".config").join(APP_NAME).join("dxt-settings");
        tokio::fs::create_dir_all(&settings_dir).await?;
        let settings_path = settings_dir.join(format!("{}.{}.json", &user, &repo));

        if !settings_path.exists() {
            return Err(anyhow::anyhow!("Manifest not found for {}.{}", user, repo));
        }

        let content = tokio::fs::read_to_string(&settings_path).await?;
        let json: serde_json::Value = serde_json::from_str(&content)?;
        Ok(json)
    }
    .await
    .map_err(|e: anyhow::Error| e.to_string())
}

pub async fn save_dxt_setting(
    user: String,
    repo: String,
    content: serde_json::Value,
) -> Result<(), String> {
    async {
        let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Cannot find home directory"))?;
        let settings_dir = home.join(".config").join(APP_NAME).join("dxt-settings");
        let settings_path = settings_dir.join(format!("{}.{}.json", &user, &repo));
        let content_string = serde_json::to_string_pretty(&content)?;
        tokio::fs::write(settings_path, content_string).await?;
        Ok(())
    }
    .await
    .map_err(|e: anyhow::Error| e.to_string())
}

pub async fn download_and_extract_manifests() -> Result<(), String> {
    async {
        let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Cannot find home directory"))?;
        let dxt_base_path = home.join(".config").join(APP_NAME).join("dxt");

        // Create base directory if it doesn't exist
        if !dxt_base_path.exists() {
            fs::create_dir_all(&dxt_base_path)?;
        }

        // Download the zip file
        let url = "https://github.com/milisp/awesome-claude-dxt/releases/latest/download/manifests.json.zip";
        let response = reqwest::get(url).await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Failed to download manifests zip: {}", response.status()));
        }

        let zip_data = response.bytes().await?;

        // Extract the manifests content from the zip file
        let manifests_content = {
            let reader = Cursor::new(zip_data);
            let mut archive = ZipArchive::new(reader)?;
            let mut content = None;

            for i in 0..archive.len() {
                let mut file = archive.by_index(i)?;
                if file.name() == "manifests.json" || file.name().ends_with("/manifests.json") {
                    let mut s = String::new();
                    file.read_to_string(&mut s)?;
                    content = Some(s);
                    break;
                }
            }
            content
        };

        if let Some(contents) = manifests_content {
            // Parse the JSON array of manifests
            let manifests: serde_json::Value = serde_json::from_str(&contents)?;

            if let Some(manifests_array) = manifests.as_array() {
                // Save each manifest to its own directory structure
                for manifest in manifests_array {
                    if let (Some(name), Some(author)) = (
                        manifest.get("name").and_then(|n| n.as_str()),
                        manifest.get("author").and_then(|a| a.get("name")).and_then(|n| n.as_str())
                    ) {
                        let manifest_dir = dxt_base_path.join(author).join(name);
                        fs::create_dir_all(&manifest_dir)?;

                        let manifest_path = manifest_dir.join("manifest.json");
                        let manifest_content = serde_json::to_string_pretty(manifest)?;
                        tokio::fs::write(manifest_path, manifest_content).await?;
                    }
                }
            }
        }

        Ok(())
    }
    .await
    .map_err(|e: anyhow::Error| e.to_string())
}

pub async fn check_manifests_exist() -> Result<bool, String> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let dxt_base_path = home.join(".config").join(APP_NAME).join("dxt");

    if !dxt_base_path.exists() {
        return Ok(false);
    }

    // Check if there are any manifest.json files
    let pattern = dxt_base_path.join("*/*/manifest.json");
    match glob(pattern.to_str().unwrap()) {
        Ok(paths) => {
            for _path in paths {
                return Ok(true); // Found at least one manifest
            }
            Ok(false)
        }
        Err(_) => Ok(false),
    }
}
