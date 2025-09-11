use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Submission {
    pub id: String,
    pub op: Op,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Op {
    ConfigureSession {
        provider: ModelProvider,
        model: String,
        model_reasoning_effort: String,
        model_reasoning_summary: String,
        user_instructions: Option<String>,
        base_instructions: Option<String>,
        approval_policy: String,
        sandbox_policy: SandboxPolicy,
        disable_response_storage: bool,
        cwd: PathBuf,
        resume_path: Option<PathBuf>,
    },
    UserInput {
        items: Vec<InputItem>,
    },
    Interrupt,
    ExecApproval {
        id: String,
        decision: String,
    },
    PatchApproval {
        id: String,
        decision: String,
    },
    Shutdown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelProvider {
    pub name: String,
    pub base_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "kebab-case")]
pub enum SandboxPolicy {
    #[serde(rename = "read-only")]
    ReadOnly,
    #[serde(rename = "workspace-write")]
    WorkspaceWrite {
        #[serde(default)]
        writable_roots: Vec<PathBuf>,
        #[serde(default)]
        network_access: bool,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum InputItem {
    Text {
        text: String,
    },
    /// Pre‑encoded data: URI image.
    Image {
        image_url: String,
    },
    /// Local image path provided by the user. This will be converted to an
    /// `Image` variant (base64 data URL) during request serialization.
    LocalImage {
        path: std::path::PathBuf,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub msg: EventMsg,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum EventMsg {
    SessionConfigured {
        session_id: String,
        model: String,
        history_log_id: Option<u32>,
        history_entry_count: Option<u32>,
    },
    TaskStarted,
    TaskComplete {
        response_id: Option<String>,
        last_agent_message: Option<String>,
    },
    AgentMessage {
        message: Option<String>,
        last_agent_message: Option<String>,
    },
    AgentMessageDelta {
        delta: String,
    },
    ExecApprovalRequest {
        call_id: String,
        command: Vec<String>,
        cwd: String,
    },
    PatchApprovalRequest {
        patch: String,
        files: Vec<String>,
    },
    ApplyPatchApprovalRequest {
        call_id: String,
        changes: serde_json::Value,
        #[serde(default)]
        reason: Option<String>,
        #[serde(default)]
        grant_root: Option<std::path::PathBuf>,
    },
    Error {
        message: String,
    },
    TurnComplete {
        response_id: Option<String>,
    },
    ExecCommandBegin {
        call_id: String,
        command: Vec<String>,
        cwd: String,
    },
    ExecCommandOutputDelta {
        call_id: String,
        stream: String,
        chunk: Vec<u8>,
    },
    ExecCommandEnd {
        call_id: String,
        stdout: String,
        stderr: String,
        exit_code: i32,
    },
    ShutdownComplete,
    BackgroundEvent {
        message: String,
    },
    TurnDiff {
        unified_diff: String,
    },
    // AI reasoning events
    AgentReasoning {
        reasoning: String,
    },
    AgentReasoningDelta {
        delta: String,
    },
    AgentReasoningRawContent {
        content: String,
    },
    AgentReasoningRawContentDelta {
        delta: String,
    },
    AgentReasoningSectionBreak,
    // Plan updates
    PlanUpdate {
        explanation: Option<String>,
        plan: Vec<PlanStep>,
    },
    // MCP tool calls
    McpToolCallBegin {
        invocation: serde_json::Value,
    },
    McpToolCallEnd {
        invocation: serde_json::Value,
        result: Option<serde_json::Value>,
        duration: Option<u64>,
    },
    // Web search
    WebSearchBegin {
        query: String,
    },
    WebSearchEnd {
        query: String,
        results: Option<serde_json::Value>,
    },
    // Patch operations
    PatchApplyBegin {
        changes: serde_json::Value,
        auto_approved: Option<bool>,
    },
    PatchApplyEnd {
        success: bool,
        stdout: Option<String>,
        stderr: Option<String>,
    },
    // Stream errors
    StreamError {
        message: String,
    },
    // Turn aborted
    TurnAborted {
        reason: String,
    },
    // Token usage
    TokenCount {
        input_tokens: Option<u64>,
        output_tokens: Option<u64>,
        total_tokens: Option<u64>,
        cached_input_tokens: Option<u64>,
        reasoning_output_tokens: Option<u64>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanStep {
    pub step: String,
    pub status: String, // "pending", "in_progress", "completed"
}

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
    pub reasoning_effort: Option<String>,
    pub resume_path: Option<String>,
    #[serde(default)]
    pub tools_web_search: Option<bool>,
}
