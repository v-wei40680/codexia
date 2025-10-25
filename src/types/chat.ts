import type { EventMsg } from "@/bindings/EventMsg";

export interface ConversationEventPayload {
  method: string;
  params: {
    conversationId?: string;
    id?: string;
    msg?: EventMsg;
    [key: string]: unknown;
  } | null;
}

export interface EventWithId {
  id: string;
  msg: EventMsg;
  /**
   * Local timestamp captured when the event was recorded on the client.
   * Used for display-only metadata.
   */
  createdAt?: number;
  /**
   * Tracks the origin of the event to support history hydration and fork flows.
   */
  source?: "live" | "history";
}

export type ConversationEvent = EventWithId;

export const DELTA_EVENT_TYPES = new Set<EventMsg["type"]>([
  "agent_message_delta",
  "agent_reasoning_delta",
  "agent_reasoning_raw_content_delta",
]);

export interface MediaAttachment {
  id: string;
  type: 'image' | 'audio';
  path: string;
  name: string;
  mimeType?: string;
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
