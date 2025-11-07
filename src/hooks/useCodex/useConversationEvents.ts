import { invoke, listen } from "@/lib/tauri-proxy";
import { handleTaskComplete } from "@/utils/handleTaskComplete";
import { useEffect, useRef } from "react";
import { ConversationId } from "@/bindings/ConversationId";
import { CodexEvent } from "@/types/chat";
import { useSessionStore } from "@/stores/useSessionStore";
import { useSystemSleepPrevention } from "../useSystemSleepPrevention";
import { AddConversationSubscriptionResponse } from "@/bindings/AddConversationSubscriptionResponse";
import { playBeep } from "@/utils/beep";
import { useCodexStore } from "@/stores/useCodexStore";
import { appendEventLine } from "@/utils/appendEventLine";
import { useBackendErrorListener } from "@/utils/backendErrorListener";

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
  const latestEvent = useRef<CodexEvent | null>(null);
  // Track turns that produced a patch; we create worktree at task_complete
  const patchRecordedTurnsRef = useRef<Set<string>>(new Set());
  const { cwd } = useCodexStore();
  
  // Extracted handler for task_complete logic
  // (kept separate to keep this hook lean)
  

  useSystemSleepPrevention(conversationId, latestEvent.current);
  useBackendErrorListener();

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!conversationId || !isConversationReady) return;
    let conversationUnlisten: (() => void) | null = null;
    let subscriptionId: string | null = null;
    let listenerResponse: AddConversationSubscriptionResponse | null;

    (async () => {
      try {
        listenerResponse = await invoke<AddConversationSubscriptionResponse>(
          "add_conversation_listener",
          {
            params: { conversationId },
          },
        );
        subscriptionId = listenerResponse.subscriptionId;
        console.debug(
          "add_conversation_listener subscriptionId:",
          subscriptionId,
        );

        conversationUnlisten = await listen(
          "codex:event",
          async (event: CodexEvent) => {
            const currentHandlers = handlersRef.current;
            const { params } = event.payload;
            const { msg } = params;
            // Use conversationId as the worktree identifier; keep a per-turn key for tracking
            const worktreeId = params.conversationId;
            const turnKey = `${params.conversationId}:${params.id}`;

            if (!msg.type.endsWith("_delta")) {
              console.log(msg.type, msg);
              await appendEventLine(conversationId, cwd, event);
            }

            latestEvent.current = event;

            currentHandlers.onAnyEvent?.(event);
            const busyOff =
              msg.type === "error" ||
              msg.type === "task_complete" ||
              msg.type === "turn_aborted";
            const busyOn = msg.type === "task_started";
            if (busyOff) {
              playBeep();
              setIsBusy(false);
            } else if (busyOn) {
              setIsBusy(true);
            }

            switch (msg.type) {
              case "task_started":
                currentHandlers.onTaskStarted?.(event);
                break;
              case "task_complete":
                // Defer worktree commit logic to extracted helper
                void handleTaskComplete({
                  event,
                  worktreeId,
                  turnKey,
                  cwd,
                  patchRecordedTurnsRef,
                });
                currentHandlers.onTaskComplete?.(event);
                break;
              case "agent_message":
                currentHandlers.onAgentMessage?.(event);
                break;
              case "agent_message_content_delta":
              case "agent_message_delta":
                break;
              case "user_message":
                currentHandlers.onUserMessage?.(event);
                break;
              case "agent_reasoning":
              case "agent_reasoning_delta":
              case "agent_reasoning_raw_content_delta":
              case "reasoning_content_delta":
              case "reasoning_raw_content_delta":
                break;
              case "agent_reasoning_section_break":
                currentHandlers.onAgentReasoningSectionBreak?.(event);
                break;
              case "exec_approval_request":
                currentHandlers.onExecApprovalRequest?.(event);
                break;
              case "apply_patch_approval_request":
                // Mark that this turn had patch-related activity
                patchRecordedTurnsRef.current.add(turnKey);
                currentHandlers.onApplyPatchApprovalRequest?.(event);
                break;
              case "exec_command_begin":
                currentHandlers.onExecCommandBegin?.(event);
                break;
              case "exec_command_end":
                currentHandlers.onExecCommandEnd?.(event);
                break;
              case "patch_apply_begin":
                // Record that this turn had patch activity; defer worktree creation to task_complete
                patchRecordedTurnsRef.current.add(turnKey);
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
                // We don't create worktrees on diff; defer to task_complete
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
