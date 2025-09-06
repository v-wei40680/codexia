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
