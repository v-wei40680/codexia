import { invoke, listen } from "@/lib/tauri-proxy";
import { useEffect, useRef } from "react";
import { ConversationId } from "@/bindings/ConversationId";
import { CodexEvent } from "@/types/chat";
import { useSessionStore } from "@/stores/useSessionStore";
import { toast } from "sonner";

export interface BackendErrorPayload {
  code: number;
  message: string;
  data?: unknown;
}

interface EventHandlers {
  isConversationReady?: boolean;
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
  { isConversationReady = false, ...handlers }: EventHandlers,
) {
  const handlersRef = useRef<EventHandlers>(handlers);
  const setIsBusy = useSessionStore((state) => state.setIsBusy);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    let backendErrorUnlisten: (() => void) | null = null;

    (async () => {
      try {
        backendErrorUnlisten = await listen<BackendErrorPayload>(
          "codex:backend-error",
          (event) => {
            const { code, message } = event.payload;
            toast.error(
              `Backend error (code: ${code}): ${message || "Unknown error"}`,
            );
            setIsBusy(false);
          },
        );
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as any).message
            : String(err);
        toast.error(
          "Failed to listen for backend errors:" +
            (message ? ` ${message}` : ""),
        );
      }
    })();

    return () => {
      backendErrorUnlisten?.();
    };
  }, [setIsBusy]);

  useEffect(() => {
    if (!conversationId || !isConversationReady) return;
    let conversationUnlisten: (() => void) | null = null;
    let subscriptionId: string | null = null;

    (async () => {
      try {
        subscriptionId = await invoke("add_conversation_listener", {
          params: { conversationId },
        });
        console.debug(
          "add_conversation_listener subscriptionId:",
          subscriptionId,
        );

        conversationUnlisten = await listen(
          "codex:event",
          (event: CodexEvent) => {
            const currentHandlers = handlersRef.current;
            const {params} = event.payload
            const {msg} = params
            const uniqueId = `${msg.type}:event_${event.id}:params_${params.id}`
            
            // Log only non-delta events for debugging
            if (!msg.type.endsWith("_delta")) {
              console.log(`event ${uniqueId}`, msg)
            }

            currentHandlers.onAnyEvent?.(event);
            const busyOff =
              msg.type === "error" ||
              msg.type === "task_complete" ||
              msg.type === "turn_aborted";
            setIsBusy(!busyOff);

            switch (msg.type) {
              case "task_started":
                currentHandlers.onTaskStarted?.(event);
                break;
              case "task_complete":
                currentHandlers.onTaskComplete?.(event);
                break;
              case "agent_message":
                currentHandlers.onAgentMessage?.(event);
                break;
              case "agent_message_content_delta":
              case "agent_message_delta":
                currentHandlers.onAgentMessageDelta?.(event);
                break;
              case "user_message":
                currentHandlers.onUserMessage?.(event);
                break;
              case "agent_reasoning":
                currentHandlers.onAgentReasoning?.(event);
                break;
              case "agent_reasoning_delta":
                currentHandlers.onAgentReasoningDelta?.(event);
                break;
              case "agent_reasoning_raw_content_delta":
                currentHandlers.onAgentReasoningDelta?.(event);
                break;
              case "reasoning_content_delta":
              case "reasoning_raw_content_delta":
                currentHandlers.onAgentReasoningDelta?.(event);
                break;
              case "agent_reasoning_section_break":
                currentHandlers.onAgentReasoningSectionBreak?.(event);
                break;
              case "exec_approval_request":
                currentHandlers.onExecApprovalRequest?.(event);
                break;
              case "apply_patch_approval_request":
                currentHandlers.onApplyPatchApprovalRequest?.(event);
                break;
              case "exec_command_begin":
                currentHandlers.onExecCommandBegin?.(event);
                break;
              case "exec_command_end":
                currentHandlers.onExecCommandEnd?.(event);
                break;
              case "patch_apply_begin":
                currentHandlers.onPatchApplyBegin?.(event);
                break;
              case "patch_apply_end":
                currentHandlers.onPatchApplyEnd?.(event);
                break;
              case "web_search_begin":
                currentHandlers.onWebSearchBegin?.(event);
                break;
              case "web_search_end":
                currentHandlers.onWebSearchEnd?.(event);
                break;
              case "mcp_tool_call_begin":
                currentHandlers.onMcpToolCallBegin?.(event);
                break;
              case "mcp_tool_call_end":
                currentHandlers.onMcpToolCallEnd?.(event);
                break;
              case "turn_diff":
                currentHandlers.onTurnDiff?.(event);
                break;
              case "token_count":
                currentHandlers.onTokenCount?.(event);
                break;
              case "stream_error":
                console.log("stream_error:", event);
                currentHandlers.onStreamError?.(event);
                break;
              case "error":
                console.log("error:", event);
                currentHandlers.onError?.(event);
                break;
              case "plan_update":
              case "item_started":
              case "item_completed":
              case "agent_reasoning_raw_content":
              case "exec_command_output_delta":
              case "turn_aborted":
                break;
              default:
                console.warn(
                  `Unknown event.id ${event.id} msg.type:`,
                  msg.type,
                );
            }
          },
        );
      } catch (err) {
        console.error("Failed to add conversation listener:", err);
      }
    })();

    return () => {
      conversationUnlisten?.();
      if (subscriptionId) {
        invoke("remove_conversation_listener", {
          params: { subscriptionId },
        });
      }
      setIsBusy(false);
    };
  }, [conversationId, isConversationReady, setIsBusy]);
}
