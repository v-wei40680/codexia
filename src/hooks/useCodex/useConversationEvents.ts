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
          const msg = (event.payload as CodexEvent["payload"]).params.msg;
          if (!msg.type.endsWith("_delta") && !msg.type.startsWith("item")) {
            console.info(`codex:event ${event.id} ${msg.type}`, event);
          }

          switch (msg.type) {
            case "task_started":
              handlers.onTaskStarted?.(msg);
              break;
            case "task_complete":
              handlers.onTaskComplete?.(msg);
              break;
            case "agent_message":
              handlers.onAgentMessage?.(msg);
              break;
            case "agent_message_delta":
              handlers.onAgentMessageDelta?.(msg);
              break;
            case "user_message":
              handlers.onUserMessage?.(msg);
              break;
            case "agent_reasoning":
              handlers.onAgentReasoning?.(msg);
              break;
            case "agent_reasoning_delta":
              handlers.onAgentReasoningDelta?.(msg);
              break;
            case "agent_reasoning_raw_content_delta":
              handlers.onAgentReasoningDelta?.(msg);
              break;
            case "agent_reasoning_section_break":
              handlers.onAgentReasoningSectionBreak?.(msg);
              break;
            case "exec_approval_request":
              handlers.onExecApprovalRequest?.(msg);
              break;
            case "apply_patch_approval_request":
              handlers.onApplyPatchApprovalRequest?.(msg);
              break;
            case "exec_command_begin":
              handlers.onExecCommandBegin?.(msg);
              break;
            case "exec_command_end":
              handlers.onExecCommandEnd?.(msg);
              break;
            case "patch_apply_begin":
              handlers.onPatchApplyBegin?.(msg);
              break;
            case "patch_apply_end":
              handlers.onPatchApplyEnd?.(msg);
              break;
            case "web_search_begin":
              handlers.onWebSearchBegin?.(msg);
              break;
            case "web_search_end":
              handlers.onWebSearchEnd?.(msg);
              break;
            case "mcp_tool_call_begin":
              handlers.onMcpToolCallBegin?.(msg);
              break;
            case "mcp_tool_call_end":
              handlers.onMcpToolCallEnd?.(msg);
              break;
            case "turn_diff":
              handlers.onTurnDiff?.(msg);
              break;
            case "token_count":
              handlers.onTokenCount?.(msg);
              break;
            case "stream_error":
              console.log("stream_error:", msg);
              handlers.onStreamError?.(msg);
              break;
            case "error":
              console.log("error:", msg);
              handlers.onError?.(msg);
              break;
            case "item_started":
            case "item_completed":
            case "agent_reasoning_raw_content":
            case "exec_command_output_delta":
            case "turn_aborted":
              break;
            default:
              console.warn(
                `Unknown event.id ${event.id} event.type:`,
                msg.type,
              );
          }
        });
      } catch (err) {
        console.error("Failed to add conversation listener:", err);
      }
    })();

    return () => {
      unlisten?.();
      // Only attempt to remove the listener if we have a valid subscription ID.
      // The backend expects a UUID string; passing null triggers a type error.
      if (subscriptionId) {
        invoke("remove_conversation_listener", {
          params: { subscriptionId },
        });
      }
    };
  }, [conversationId]);
}
