//! Reads `llms.json` at compile time and writes all `model_providers` entries
//! to the Codex app-server config on startup.

use crate::app_server::CodexAppServer;
use crate::providers::RootConfig;
use serde_json::json;

/// Maximum number of retry attempts when the app-server is not yet initialized.
const MAX_INIT_RETRIES: u32 = 10;

/// Delay between retry attempts in milliseconds.
const RETRY_DELAY_MS: u64 = 200;

/// Shared retry loop used by [`write_model_providers`].
///
/// Sends `config/value/write` with upsert merge strategy. Retries on
/// "Not initialized" errors up to [`MAX_INIT_RETRIES`] times.
async fn upsert_config_value(
    client: &CodexAppServer,
    key_path: &str,
    value: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let mut attempts = 0;
    let write_params = json!({
        "keyPath": key_path,
        "value": value,
        "mergeStrategy": "upsert"
    });

    loop {
        match client
            .send_request("config/value/write", write_params.clone())
            .await
        {
            Ok(res) => {
                return Ok(res);
            }
            Err(e) => {
                let err_str = format!("{:?}", e);
                if err_str.contains("Not initialized") && attempts < MAX_INIT_RETRIES {
                    attempts += 1;
                    tokio::time::sleep(tokio::time::Duration::from_millis(RETRY_DELAY_MS)).await;
                    continue;
                }
                return Err(format!("Failed to write config at {}: {}", key_path, err_str));
            }
        }
    }
}

/// Provider IDs that are reserved built-ins in the Codex app-server and
/// cannot be overridden via `config/value/write`.
const BUILTIN_PROVIDER_IDS: &[&str] = &["ollama"];

/// Reads all providers from the bundled `llms.json` and writes each one to
/// the Codex app-server under `model_providers.<provider_name>`.
///
/// Built-in provider IDs (e.g. `ollama`) are skipped since the app-server
/// rejects attempts to override them.
///
/// Each provider entry is transformed from the `llms.json` schema into the
/// app-server config schema: the `model_provider` field is renamed to `name`.
pub async fn write_model_providers(client: &CodexAppServer) -> Result<(), String> {
    let json_str = include_str!("../llms.json");
    let config: RootConfig =
        serde_json::from_str(json_str).map_err(|e| format!("Failed to parse llms.json: {}", e))?;

    for provider in config.data {
        // Skip reserved built-in providers — the app-server rejects overrides.
        if BUILTIN_PROVIDER_IDS.contains(&provider.model_provider.as_str()) {
            log::debug!(
                "Skipping built-in provider: {}",
                provider.model_provider
            );
            continue;
        }

        let provider_value = json!({
            "name": provider.model_provider,
            "env_key": provider.env_key,
            "base_url": provider.base_url,
        });

        let key_path = format!("model_providers.{}", provider.model_provider);

        match upsert_config_value(client, &key_path, provider_value).await {
            Ok(_) => {
                log::info!("Config written for provider: {}", provider.model_provider);
            }
            Err(e) => {
                log::error!("{}", e);
            }
        }
    }

    Ok(())
}
