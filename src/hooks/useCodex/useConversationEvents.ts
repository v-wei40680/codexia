import { invoke, listen } from "@/lib/tauri-proxy";
import { useEffect } from "react";
import { ConversationId } from "@/bindings/ConversationId";
import { CodexEvent } from "@/types/chat";

interface EventHandlers {
  onAnyEvent?: (event: CodexEvent) => void;
  onTaskStarted?: (event: CodexEvent) => void;
  onTaskComplete?: (event: CodexEvent) => void;
  onAgentMessage?: (event: CodexEvent) => void;
  onAgentMessageDelta?: (event: CodexEvent) => void;
  onUserMessage?: (event: CodexEvent) => void;
  onAgentReasoning?: (event: CodexEvent) => void;
  onAgentReasoningDelta?: (event: CodexEvent) => void;
  onAgentReasoningSectionBreak?: (event: CodexEvent) => void;
  onExecApprovalRequest?: (event: CodexEvent) => void;
  onApplyPatchApprovalRequest?: (event: CodexEvent) => void;
  onExecCommandBegin?: (event: CodexEvent) => void;
  onExecCommandEnd?: (event: CodexEvent) => void;
  onPatchApplyBegin?: (event: CodexEvent) => void;
  onPatchApplyEnd?: (event: CodexEvent) => void;
  onWebSearchBegin?: (event: CodexEvent) => void;
  onWebSearchEnd?: (event: CodexEvent) => void;
  onMcpToolCallBegin?: (event: CodexEvent) => void;
  onMcpToolCallEnd?: (event: CodexEvent) => void;
  onTurnDiff?: (event: CodexEvent) => void;
  onTokenCount?: (event: CodexEvent) => void;
  onStreamError?: (event: CodexEvent) => void;
  onError?: (event: CodexEvent) => void;
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

        unlisten = await listen("codex:event", (event: CodexEvent) => {
          const msg = (event.payload as CodexEvent["payload"]).params.msg;
          if (!msg.type.endsWith("_delta") && !msg.type.startsWith("item")) {
            console.info(`codex:event ${event.id} ${msg.type}`, event);
          }

          handlers.onAnyEvent?.(event);

          switch (msg.type) {
            case "task_started":
              handlers.onTaskStarted?.(event);
              break;
            case "task_complete":
              handlers.onTaskComplete?.(event);
              break;
            case "agent_message":
              handlers.onAgentMessage?.(event);
              break;
            case "agent_message_delta":
              handlers.onAgentMessageDelta?.(event);
              break;
            case "user_message":
              handlers.onUserMessage?.(event);
              break;
            case "agent_reasoning":
              handlers.onAgentReasoning?.(event);
              break;
            case "agent_reasoning_delta":
              handlers.onAgentReasoningDelta?.(event);
              break;
            case "agent_reasoning_raw_content_delta":
              handlers.onAgentReasoningDelta?.(event);
              break;
            case "agent_reasoning_section_break":
              handlers.onAgentReasoningSectionBreak?.(event);
              break;
            case "exec_approval_request":
              handlers.onExecApprovalRequest?.(event);
              break;
            case "apply_patch_approval_request":
              handlers.onApplyPatchApprovalRequest?.(event);
              break;
            case "exec_command_begin":
              handlers.onExecCommandBegin?.(event);
              break;
            case "exec_command_end":
              handlers.onExecCommandEnd?.(event);
              break;
            case "patch_apply_begin":
              handlers.onPatchApplyBegin?.(event);
              break;
            case "patch_apply_end":
              handlers.onPatchApplyEnd?.(event);
              break;
            case "web_search_begin":
              handlers.onWebSearchBegin?.(event);
              break;
            case "web_search_end":
              handlers.onWebSearchEnd?.(event);
              break;
            case "mcp_tool_call_begin":
              handlers.onMcpToolCallBegin?.(event);
              break;
            case "mcp_tool_call_end":
              handlers.onMcpToolCallEnd?.(event);
              break;
            case "turn_diff":
              handlers.onTurnDiff?.(event);
              break;
            case "token_count":
              handlers.onTokenCount?.(event);
              break;
            case "stream_error":
              console.log("stream_error:", event);
              handlers.onStreamError?.(event);
              break;
            case "error":
              console.log("error:", event);
              handlers.onError?.(event);
              break;
            case "item_started":
            case "item_completed":
            case "agent_reasoning_raw_content":
            case "exec_command_output_delta":
            case "turn_aborted":
              break;
            default:
              console.warn(`Unknown event.id ${event.id} msg.type:`, msg.type);
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
