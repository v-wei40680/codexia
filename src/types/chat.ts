export interface MediaAttachment {
  id: string;
  type: 'image' | 'audio';
  path: string;
  name: string;
  mimeType?: string;
  dataUrl?: string; // base64 data URL
}

// Import ApprovalRequest from codex types to avoid duplication
import type { ApprovalRequest } from './codex';

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "approval";
  content: string;
  title?: string;
  timestamp: number;
  image?: string; // deprecated, use attachments
  attachments?: MediaAttachment[];
  isStreaming?: boolean;
  model?: string;
  approvalRequest?: ApprovalRequest; // Use proper ApprovalRequest type
  // Optional metadata for rendering
  messageType?: 'reasoning' | 'tool_call' | 'plan_update' | 'exec_command' | 'normal';
  eventType?: string; // raw event msg.type from codex events
  toolInfo?: {
    name: string;
    status: 'running' | 'completed' | 'failed';
    duration?: number;
  };
  // Optional structured plan payload for plan_update messages
  plan?: {
    explanation?: string | null;
    plan: Array<{ step: string; status: 'pending' | 'in_progress' | 'completed' }>;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
  filePath?: string;
  isLoading?: boolean;
  projectRealpath?: string;
  // Optional category assignment for filtering
  categoryId?: string | null;
  // Backend session correlation and resume
  codexSessionId?: string; // UUID from SessionConfigured
  resumePath?: string; // Path to rollout jsonl for resume
  // Fork metadata for branching conversations
  forkMeta?: {
    fromConversationId: string;
    parentMessageId: string;
    history: ChatMessage[];
    applied?: boolean; // whether the fork context has been sent to backend
  };
}

export type Provider =
  | "anthropic"
  | "openai"
  | "openrouter"
  | "google"
  | "ollama";

export interface ProviderConfig {
  value: Provider;
  label: string;
  models: string[];
  defaultBaseUrl?: string;
}
