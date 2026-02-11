// Message types for Claude Code - matches claude-agent-sdk-rs

/** Error types for assistant messages */
export type AssistantMessageError =
  | 'authentication_failed'
  | 'billing_error'
  | 'rate_limit'
  | 'invalid_request'
  | 'server_error'
  | 'unknown';

/** Text content block */
export interface TextBlock {
  type: 'text';
  text: string;
}

/** Thinking block (extended thinking) */
export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
  signature: string;
}

/** Tool use block */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

/** Tool result content */
export type ToolResultContent = string | Array<Record<string, any>>;

/** Tool result block */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content?: ToolResultContent;
  is_error?: boolean;
}

/** Content block types */
export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock;

/** User message */
export interface UserMessage {
  type: 'user';
  text?: string;
  content?: ContentBlock[];
  uuid?: string;
  parent_tool_use_id?: string;
  // Legacy format from Claude Code history
  message?: {
    role: 'user';
    content: string | ContentBlock[];
  };
  [key: string]: any; // extra fields
}

/** Inner assistant message content */
export interface AssistantMessageInner {
  content: ContentBlock[];
  model?: string;
  id?: string;
  stop_reason?: string;
  usage?: Record<string, any>;
  error?: AssistantMessageError;
}

/** Assistant message */
export interface AssistantMessage {
  type: 'assistant';
  message: AssistantMessageInner;
  parent_tool_use_id?: string;
  session_id?: string;
  uuid?: string;
}

/** System message */
export interface SystemMessage {
  type: 'system';
  subtype: string;
  cwd?: string;
  session_id?: string;
  tools?: string[];
  mcp_servers?: Array<Record<string, any>>;
  model?: string;
  permission_mode?: string;
  uuid?: string;
  [key: string]: any; // data fields
}

/** Result message indicating query completion */
export interface ResultMessage {
  type: 'result';
  subtype: string;
  duration_ms: number;
  duration_api_ms: number;
  is_error: boolean;
  num_turns: number;
  session_id: string;
  total_cost_usd?: number;
  usage?: Record<string, any>;
  result?: string;
  structured_output?: Record<string, any>;
}

/** Stream event message */
export interface StreamEvent {
  type: 'stream_event';
  uuid: string;
  session_id: string;
  event: Record<string, any>;
  parent_tool_use_id?: string;
}

/** Control cancel request (internal protocol) */
export interface ControlCancelRequest {
  type: 'control_cancel_request';
  [key: string]: any;
}

/** Main message union type */
export type CCMessage =
  | AssistantMessage
  | SystemMessage
  | ResultMessage
  | StreamEvent
  | UserMessage
  | ControlCancelRequest;

/** Type guards */
export function isAssistantMessage(msg: CCMessage): msg is AssistantMessage {
  return msg.type === 'assistant';
}

export function isUserMessage(msg: CCMessage): msg is UserMessage {
  return msg.type === 'user';
}

export function isSystemMessage(msg: CCMessage): msg is SystemMessage {
  return msg.type === 'system';
}

export function isResultMessage(msg: CCMessage): msg is ResultMessage {
  return msg.type === 'result';
}

export function isStreamEvent(msg: CCMessage): msg is StreamEvent {
  return msg.type === 'stream_event';
}

export function isTextBlock(block: ContentBlock): block is TextBlock {
  return block.type === 'text';
}

export function isThinkingBlock(block: ContentBlock): block is ThinkingBlock {
  return block.type === 'thinking';
}

export function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
  return block.type === 'tool_use';
}

export function isToolResultBlock(block: ContentBlock): block is ToolResultBlock {
  return block.type === 'tool_result';
}
