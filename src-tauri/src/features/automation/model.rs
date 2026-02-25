use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AutomationScheduleMode {
    Daily,
    Interval,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationSchedule {
    pub mode: AutomationScheduleMode,
    #[serde(default)]
    pub hour: Option<u8>,
    #[serde(default)]
    pub minute: Option<u8>,
    #[serde(default)]
    pub interval_hours: Option<u8>,
    #[serde(default)]
    pub weekdays: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationTask {
    pub id: String,
    pub name: String,
    pub projects: Vec<String>,
    pub prompt: String,
    #[serde(default = "default_agent", alias = "access_mode")]
    pub agent: String,
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default = "default_model_provider")]
    pub model_provider: String,
    pub schedule: AutomationSchedule,
    pub cron_expression: String,
    pub created_at: String,
    #[serde(default)]
    pub paused: bool,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub(super) struct AutomationStore {
    pub(super) tasks: Vec<AutomationTask>,
}

pub(super) fn default_agent() -> String {
    "codex".to_string()
}

pub(super) fn default_model() -> String {
    "gpt-5-codex".to_string()
}

pub(super) fn default_model_provider() -> String {
    "openai".to_string()
}

pub(super) fn normalize_agent(value: Option<String>) -> Result<String, String> {
    let normalized = value
        .unwrap_or_else(default_agent)
        .trim()
        .to_ascii_lowercase();
    if normalized == "codex" || normalized == "cc" {
        return Ok(normalized);
    }
    if normalized == "agent" {
        return Ok("codex".to_string());
    }
    Err("agent must be 'codex' or 'cc'".to_string())
}

pub(super) fn normalize_model_provider(value: Option<String>) -> Result<String, String> {
    let normalized = value
        .unwrap_or_else(default_model_provider)
        .trim()
        .to_ascii_lowercase();
    if normalized == "openai" || normalized == "ollama" {
        return Ok(normalized);
    }
    Err("model provider must be 'openai' or 'ollama'".to_string())
}
