use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodexConfig {
    pub working_directory: String,
    pub model: String,
    pub provider: String,
    pub use_oss: bool,
    pub custom_args: Option<Vec<String>>,
    pub approval_policy: String,
    pub sandbox_mode: String,
    pub codex_path: Option<String>,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub reasoning_effort: Option<String>,
    pub resume_path: Option<String>,
    pub tools_web_search: Option<bool>,
}
