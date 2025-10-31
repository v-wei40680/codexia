import { memo } from "react";

import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { useChatInputStore } from "@/stores/chatInputStore";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { EventBubble } from "./EventBubble";
import { formatAbortReason } from "./helpers";
import { PlanDisplay } from "../chat/messages/PlanDisplay";
import { TurnDiffView } from "./TurnDiffView";
import { AccordionMsg } from "./AccordionMsg";
import { MessageFooter } from "@/components/chat/MessageFooter";
import { ExecApprovalRequestItem } from "./ExecApprovalRequestItem";
import { ApplyPatchApprovalRequestItem } from "./ApplyPatchApprovalRequestItem";
import { CodexEvent } from "@/types/chat";
import { Bot } from "lucide-react";

export const EventItem = memo(function EventItem({
  event,
  conversationId,
}: {
  event: CodexEvent;
  conversationId: string | null;
}) {
  const { msg, id } = event.payload.params;
  const { setInputValue, requestFocus, setEditingTarget, clearEditingTarget } =
    useChatInputStore();
  const startPendingConversation = useActiveConversationStore(
    (state) => state.startPendingConversation,
  );

  switch (msg.type) {
    case "user_message": {
      const messageText = msg.message ?? "";
      const createdAt = event.createdAt ?? Date.now();
      const handleEdit = () => {
        setInputValue(messageText);
        if (conversationId) {
          setEditingTarget(conversationId, id);
        }
        requestFocus();
      };

      return (
        <div className="group space-y-1">
          <EventBubble align="end" variant="user">
            <p className="whitespace-pre-wrap leading-relaxed">{messageText}</p>
          </EventBubble>
          <MessageFooter
            align="end"
            messageId={id}
            messageContent={messageText}
            messageRole="user"
            timestamp={createdAt}
            selectedText=""
            messageType="normal"
            eventType={msg.type}
            onEdit={messageText.trim().length > 0 ? handleEdit : undefined}
          />
        </div>
      );
    }
    case "agent_message": {
      const messageText = msg.message ?? "";
      const createdAt = event.createdAt ?? Date.now();
      const handleFork = () => {
        clearEditingTarget();
        startPendingConversation();
        setInputValue(messageText);
        requestFocus();
      };
      return (
        <div className="group space-y-1">
          <div className="flex gap-2">
            <Bot />
            <MarkdownRenderer content={messageText} />
          </div>
          <MessageFooter
            messageId={id}
            messageContent={messageText}
            messageRole="assistant"
            timestamp={createdAt}
            selectedText=""
            messageType="normal"
            eventType={msg.type}
            onFork={messageText.trim().length > 0 ? handleFork : undefined}
          />
        </div>
      );
    }
    case "agent_reasoning":
    case "agent_reasoning_raw_content":
      return (
        <span className="flex">
          <AccordionMsg title={`🧠 ${msg.text}`} content={msg.text} />
        </span>
      );
      return null;
    case "exec_approval_request":
      return (
        <ExecApprovalRequestItem
          event={event}
          conversationId={conversationId}
        />
      );
    case "apply_patch_approval_request":
      return (
        <ApplyPatchApprovalRequestItem
          event={event}
          conversationId={conversationId}
        />
      );
    case "turn_aborted":
      return (
        <EventBubble align="start" variant="system" title="Turn Aborted">
          <div className="space-y-2">
            <Badge variant="destructive">{msg.reason}</Badge>
            <p className="text-sm text-muted-foreground">
              {formatAbortReason(msg.reason)}
            </p>
          </div>
        </EventBubble>
      );
    case "turn_diff":
      return <TurnDiffView content={msg.unified_diff} />;
    case "plan_update":
      return <PlanDisplay steps={msg.plan} />;
    case "agent_message_delta":
    case "agent_reasoning_delta":
    case "agent_reasoning_raw_content_delta":
    case "exec_command_begin":
    case "exec_command_end":
    case "patch_apply_begin":
    case "patch_apply_end":
    case "task_complete":
    case "task_started":
    case "exec_command_output_delta":
    case "token_count":
    case "item_started":
    case "item_completed":
    case "agent_reasoning_section_break":
    case "session_configured":
      return null;
    case "error":
      return <span className="bg-red-500">{msg.message}</span>;
    case "stream_error":
      return <span className="bg-red-500">{msg.message}</span>;
    default:
      return (
        <AccordionMsg title={msg.type} content={JSON.stringify(msg, null, 2)} />
      );
  }
});
