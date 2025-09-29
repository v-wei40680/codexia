export interface CodexEvent {
  id: string;
  msg: EventMsg;
  // Present when backend attaches session routing info
  session_id?: string;
}

type TokenUsageInfo = {
  total_token_usage: TokenCount;
  last_token_usage: TokenCount;
  model_context_window: number;
};

type TokenCount = {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  total_tokens: number;
};

type RateLimits = {
  primary: RateLimitInfo;
  secondary: RateLimitInfo;
};

type RateLimitInfo = {
  used_percent: number;
  window_minutes: number;
  resets_in_seconds: number;
};

export type EventMsg =
  | {
      type: "session_configured";
      session_id: string;
      model: string;
      history_log_id?: number;
      history_entry_count?: number;
    }
  | { type: "task_started" }
  | {
      type: "token_count";
      info: TokenUsageInfo | null;
      rate_limits: RateLimits | null;
    }
  | { type: "task_complete"; response_id?: string; last_agent_message?: string }
  | { type: "agent_message"; message?: string; last_agent_message?: string }
  | { type: "agent_message_delta"; delta: string }
  | { type: "agent_reasoning"; reasoning?: string; text?: string }
  | { type: "agent_reasoning_delta"; delta: string }
  | { type: "agent_reasoning_raw_content"; content?: string; text?: string }
  | { type: "agent_reasoning_raw_content_delta"; delta: string }
  | { type: "agent_reasoning_section_break" }
  | {
      type: "exec_approval_request";
      call_id: string;
      command: string[];
      cwd: string;
    }
  | { type: "patch_approval_request"; patch: string; files: string[] }
  | {
      type: "apply_patch_approval_request";
      call_id: string;
      changes: any;
      reason?: string;
      grant_root?: string;
    }
  | { type: "error"; message: string }
  | { type: "turn_complete"; response_id?: string }
  | {
      type: "exec_command_begin";
      call_id: string;
      command: string[];
      cwd: string;
    }
  | {
      type: "exec_command_output_delta";
      call_id: string;
      stream: string;
      chunk: number[];
    }
  | {
      type: "exec_command_end";
      call_id: string;
      stdout: string;
      stderr: string;
      exit_code: number;
    }
  | { type: "mcp_tool_call_begin"; invocation: any }
  | {
      type: "mcp_tool_call_end";
      invocation: any;
      result?: any;
      duration?: number;
    }
  | { type: "web_search_begin"; query: string }
  | { type: "web_search_end"; query: string; results?: any }
  | { type: "patch_apply_begin"; changes: any; auto_approved?: boolean }
  | {
      type: "patch_apply_end";
      success: boolean;
      stdout?: string;
      stderr?: string;
    }
  | {
      type: "plan_update";
      explanation?: string | null;
      plan: Array<{
        step: string;
        status: "pending" | "in_progress" | "completed";
      }>;
    }
  | { type: "shutdown_complete" }
  | { type: "background_event"; message: string }
  | { type: "turn_diff"; unified_diff: string }
  | { type: "stream_error"; message: string }
  | { type: "turn_aborted"; reason: string };

// Note: ChatMessage is now defined in ./chat.ts to avoid duplication

export interface ApprovalRequest {
  id: string;
  type: "exec" | "patch" | "apply_patch";
  command?: string;
  cwd?: string;
  patch?: string;
  files?: string[];
  call_id?: string;
  changes?: any;
  reason?: string;
  grant_root?: string;
}

export interface CodexConfig {
  workingDirectory: string;
  model: string;
  provider: string; // Support any provider from config.toml
  useOss: boolean;
  customArgs?: string[];
  approvalPolicy: "untrusted" | "on-failure" | "on-request" | "never";
  sandboxMode: "read-only" | "workspace-write" | "danger-full-access";
  codexPath?: string;
  reasoningEffort?: "high" | "medium" | "low" | "minimal";
  // Optional: resume a previous session from a rollout file
  resumePath?: string;
  // Enable experimental web search tool for the agent
  webSearchEnabled?: boolean;
}

export const SANDBOX_MODES: Record<
  CodexConfig["sandboxMode"],
  {
    label: string;
    shortLabel: string;
    description: string;
    defaultApprovalPolicy: CodexConfig["approvalPolicy"];
  }
> = {
  "read-only": {
    label: "Read Only",
    shortLabel: "Chat or plan",
    description: "View files only, requires approval for edits/commands",
    defaultApprovalPolicy: "untrusted",
  },
  "workspace-write": {
    label: "Workspace Write",
    shortLabel: "Agent",
    description: "Edit project files, approval for network/external access",
    defaultApprovalPolicy: "on-request",
  },
  "danger-full-access": {
    label: "Full Access",
    shortLabel: "Agent (Full)",
    description: "System-wide access without restrictions",
    defaultApprovalPolicy: "never",
  },
};

export const APPROVAL_POLICIES: Array<{
  value: CodexConfig["approvalPolicy"];
  label: string;
  description: string;
}> = [
  {
    value: "untrusted",
    label: "Untrusted",
    description: "Always prompt before running commands, editing, or using tools.",
  },
  {
    value: "on-failure",
    label: "On Failure",
    description: "Try actions automatically and only prompt if sandbox blocks them.",
  },
  {
    value: "on-request",
    label: "On Request",
    description: "Ask before risky actions like editing, running commands, or network access.",
  },
  {
    value: "never",
    label: "Never",
    description: "Never prompt; Codex decides autonomously. Use with caution.",
  },
];

export const DEFAULT_CONFIG: CodexConfig = {
  workingDirectory: "",
  model: "gpt-5-codex",
  provider: "openai",
  useOss: false,
  approvalPolicy: "on-request",
  sandboxMode: "workspace-write",
  webSearchEnabled: false,
};

export type McpServerConfig =
  | {
      type: "stdio";
      command: string;
      args: string[];
      env?: Record<string, string>;
    }
  | {
      type: "http";
      url: string;
    };
