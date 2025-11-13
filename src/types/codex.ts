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