export interface MediaAttachment {
  id: string;
  type: 'image' | 'audio';
  path: string;
  name: string;
  mimeType?: string;
  dataUrl?: string; // base64 data URL
}

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
  workingDirectory?: string;
  approvalRequest?: any; // Support for approval requests
}

export type ChatMode = "chat" | "agent";

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  mode: ChatMode;
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
  filePath?: string;
  isLoading?: boolean;
  projectRealpath?: string;
}

export interface ChatRequest {
  message: string;
  provider: string;
  model: string;
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
  

export interface AppConfig {
  provider?: string;
  api_key?: string;
  chat_url?: string;
  model_name?: string;
  proxy?: boolean;
  support_tool?: boolean;
}
