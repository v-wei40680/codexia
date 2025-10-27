import { invoke, listen } from "@/lib/tauri-proxy";
import { useEffect } from "react";
import { EventMsg } from "@/bindings/EventMsg";
import { AgentMessageDeltaEvent } from "@/bindings/AgentMessageDeltaEvent";
import { AgentMessageEvent } from "@/bindings/AgentMessageEvent";
import { AgentReasoningDeltaEvent } from "@/bindings/AgentReasoningDeltaEvent";
import { AgentReasoningEvent } from "@/bindings/AgentReasoningEvent";
import { AgentReasoningSectionBreakEvent } from "@/bindings/AgentReasoningSectionBreakEvent";
import { ApplyPatchApprovalRequestEvent } from "@/bindings/ApplyPatchApprovalRequestEvent";
import { ExecApprovalRequestEvent } from "@/bindings/ExecApprovalRequestEvent";
import { ExecCommandEndEvent } from "@/bindings/ExecCommandEndEvent";
import { PatchApplyEndEvent } from "@/bindings/PatchApplyEndEvent";
import { TaskCompleteEvent } from "@/bindings/TaskCompleteEvent";
import { TaskStartedEvent } from "@/bindings/TaskStartedEvent";
import { UserMessageEvent } from "@/bindings/UserMessageEvent";
import { PatchApplyBeginEvent } from "@/bindings/PatchApplyBeginEvent";
import { ExecCommandBeginEvent } from "@/bindings/ExecCommandBeginEvent";
import { TurnDiffEvent } from "@/bindings/TurnDiffEvent";
import { ConversationId } from "@/bindings/ConversationId";
import { WebSearchBeginEvent } from "@/bindings/WebSearchBeginEvent";
import { WebSearchEndEvent } from "@/bindings/WebSearchEndEvent";
import { McpToolCallBeginEvent } from "@/bindings/McpToolCallBeginEvent";
import { McpToolCallEndEvent } from "@/bindings/McpToolCallEndEvent";
import { ErrorEvent } from "@/bindings/ErrorEvent";
import { TokenCountEvent } from "@/bindings/TokenCountEvent";
import { StreamErrorEvent } from "@/bindings/StreamErrorEvent";

interface CodexEvent {
  payload: {
    params: {
      msg: EventMsg;
    };
  };
}

interface EventHandlers {
  onTaskStarted?: (event: TaskStartedEvent) => void;
  onTaskComplete?: (event: TaskCompleteEvent) => void;
  onAgentMessage?: (event: AgentMessageEvent) => void;
  onAgentMessageDelta?: (event: AgentMessageDeltaEvent) => void;
  onUserMessage?: (event: UserMessageEvent) => void;
  onAgentReasoning?: (event: AgentReasoningEvent) => void;
  onAgentReasoningDelta?: (event: AgentReasoningDeltaEvent) => void;
  onAgentReasoningSectionBreak?: (
    event: AgentReasoningSectionBreakEvent,
  ) => void;
  onExecApprovalRequest?: (event: ExecApprovalRequestEvent) => void;
  onApplyPatchApprovalRequest?: (event: ApplyPatchApprovalRequestEvent) => void;
  onExecCommandBegin?: (event: ExecCommandBeginEvent) => void;
  onExecCommandEnd?: (event: ExecCommandEndEvent) => void;
  onPatchApplyBegin?: (event: PatchApplyBeginEvent) => void;
  onPatchApplyEnd?: (event: PatchApplyEndEvent) => void;
  onWebSearchBegin?: (event: WebSearchBeginEvent) => void;
  onWebSearchEnd?: (event: WebSearchEndEvent) => void;
  onMcpToolCallBegin?: (event: McpToolCallBeginEvent) => void;
  onMcpToolCallEnd?: (event: McpToolCallEndEvent) => void;
  onTurnDiff?: (event: TurnDiffEvent) => void;
  onTokenCount?: (event: TokenCountEvent) => void;
  onStreamError?: (event: StreamErrorEvent) => void;
  onError?: (event: ErrorEvent) => void;
}

export function useConversationEvents(
  conversationId: ConversationId | null,
  handlers: EventHandlers,
) {
  useEffect(() => {
    if (!conversationId) return;
    let unlisten: (() => void) | null = null;
    let subscriptionId: string | null = null;

    (async () => {
      try {
        subscriptionId = await invoke("add_conversation_listener", {
          params: { conversationId },
        });

        unlisten = await listen("codex:event", (event) => {
          console.info("codex:event", event)
          const eventMsg = (event.payload as CodexEvent['payload']).params.msg;

          switch (eventMsg.type) {
            case "task_started":
              handlers.onTaskStarted?.(eventMsg);
              break;
            case "task_complete":
              handlers.onTaskComplete?.(eventMsg);
              break;
            case "agent_message":
              handlers.onAgentMessage?.(eventMsg);
              break;
            case "agent_message_delta":
              handlers.onAgentMessageDelta?.(eventMsg);
              break;
            case "user_message":
              handlers.onUserMessage?.(eventMsg);
              break;
            case "agent_reasoning":
              handlers.onAgentReasoning?.(eventMsg);
              break;
            case "agent_reasoning_delta":
              handlers.onAgentReasoningDelta?.(eventMsg);
              break;
            case "agent_reasoning_section_break":
              handlers.onAgentReasoningSectionBreak?.(eventMsg);
              break;
            case "exec_approval_request":
              handlers.onExecApprovalRequest?.(eventMsg);
              break;
            case "apply_patch_approval_request":
              handlers.onApplyPatchApprovalRequest?.(eventMsg);
              break;
            case "exec_command_begin":
              handlers.onExecCommandBegin?.(eventMsg);
              break;
            case "exec_command_end":
              handlers.onExecCommandEnd?.(eventMsg);
              break;
            case "patch_apply_begin":
              handlers.onPatchApplyBegin?.(eventMsg);
              break;
            case "patch_apply_end":
              handlers.onPatchApplyEnd?.(eventMsg);
              break;
            case "web_search_begin":
              handlers.onWebSearchBegin?.(eventMsg);
              break;
            case "web_search_end":
              handlers.onWebSearchEnd?.(eventMsg);
              break;
            case "mcp_tool_call_begin":
              handlers.onMcpToolCallBegin?.(eventMsg);
              break;
            case "mcp_tool_call_end":
              handlers.onMcpToolCallEnd?.(eventMsg);
              break;
            case "turn_diff":
              handlers.onTurnDiff?.(eventMsg);
              break;
            case "token_count":
              handlers.onTokenCount?.(eventMsg);
              break
            case "stream_error":
              handlers.onStreamError?.(eventMsg);
              break
            default:
              console.warn("Unknown event type:", eventMsg.type);
          }
        });
      } catch (err) {
        console.error("Failed to add conversation listener:", err);
      }
    })();

    return () => {
      unlisten?.();
      invoke("remove_conversation_listener", {
        params: { subscriptionId },
      });
    };
  }, [conversationId]);
}
