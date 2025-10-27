import { memo } from "react";

import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { useChatInputStore } from "@/stores/chatInputStore";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import type { ConversationEvent } from "@/types/chat";
import { EventBubble } from "./EventBubble";
import { OutputBlock } from "./OutputBlock";
import {
  describeParsedCommand,
  formatAbortReason,
} from "./helpers";
import { PlanDisplay } from "../chat/messages/PlanDisplay";
import { TurnDiffView } from "./TurnDiffView";
import { AccordionMsg } from "./AccordionMsg";
import { MessageFooter } from "@/components/chat/MessageFooter";
import { ExecApprovalRequestItem } from "./ExecApprovalRequestItem";
import { PatchApplyBeginItem } from "./PatchApplyBeginItem";
import { ApplyPatchApprovalRequestItem } from "./ApplyPatchApprovalRequestItem";

export const EventItem = memo(function EventItem({
  event,
  conversationId,
}: {
  event: ConversationEvent;
  conversationId: string | null;
}) {
  const { msg } = event;
  const {setInputValue, requestFocus, setEditingTarget, clearEditingTarget } = useChatInputStore();
  const { setActiveConversationId } = useActiveConversationStore();

  switch (msg.type) {
    case "user_message":
      {
        const messageText = msg.message ?? "";
        const createdAt = event.createdAt ?? Date.now();
        const handleEdit = () => {
          setInputValue(messageText);
          if (conversationId) {
            setEditingTarget(conversationId, event.id);
          }
          requestFocus();
        };

        return (
          <div className="group space-y-1">
            <EventBubble align="end" variant="user">
              <p className="whitespace-pre-wrap leading-relaxed">
                {messageText}
              </p>
            </EventBubble>
            <MessageFooter
              align="end"
              messageId={event.id}
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
    case "agent_message":
      {
        const messageText = msg.message ?? "";
        const createdAt = event.createdAt ?? Date.now();
        const handleFork = () => {
          clearEditingTarget();
          setActiveConversationId(null);
          setInputValue(messageText);
          requestFocus();
        };
        return (
          <div className="group space-y-1">
            <MarkdownRenderer content={messageText} />
            <MessageFooter
              messageId={event.id}
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
      return <span className="flex">✨<MarkdownRenderer content={msg.text} /></span>;
    case "exec_approval_request":
      return (
        <ExecApprovalRequestItem
          event={event}
          conversationId={conversationId}
        />
      );
    case "exec_command_begin":
      const title = msg.parsed_cmd.map(item => describeParsedCommand(item)).join("")
      return (
        <EventBubble
          align="start"
          variant="system"
          title={title}
        >
          <div className="space-y-2">
            <code className="block whitespace-pre-wrap rounded bg-muted/40 px-2 py-1 font-mono text-xs">
              {msg.command.join(" ")}
            </code>
          </div>
        </EventBubble>
      );
    case "exec_command_end":
      return null;
    case "patch_apply_begin":
      return <PatchApplyBeginItem event={event} />;
    case "apply_patch_approval_request":
      return (
        <ApplyPatchApprovalRequestItem
          event={event}
          conversationId={conversationId}
        />
      );
    case "patch_apply_end":
      return (
        <EventBubble
          align="start"
          variant="system"
          title="Patch Result"
        >
          <div className="space-y-3">
            <Badge variant={msg.success ? "secondary" : "destructive"}>
              {msg.success ? "Succeeded" : "Failed"}
            </Badge>
            <OutputBlock label="stdout" value={msg.stdout} />
            <OutputBlock label="stderr" value={msg.stderr} />
          </div>
        </EventBubble>
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
      return <TurnDiffView content={msg.unified_diff} />
    case "task_complete":
    case "task_started":
    case "exec_command_output_delta":
    case "token_count":
    case "item_started":
    case "item_completed":
      return null;
    case "agent_reasoning_section_break":
      return null;
    case "plan_update":
      return <PlanDisplay steps={msg.plan} />
    case "session_configured":
      return null;
    default:
      return <AccordionMsg title={msg.type} content={JSON.stringify(msg, null, 2)} />
  }
});
