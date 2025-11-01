import { memo } from "react";

import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { EventBubble } from "./EventBubble";
import { formatAbortReason } from "./helpers";
import { PlanDisplay } from "../chat/messages/PlanDisplay";
import { TurnDiffView } from "./TurnDiffView";
import { AccordionMsg } from "./AccordionMsg";
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
  const { msg } = event.payload.params;
  if (msg.type.endsWith("_delta")) return
  switch (msg.type) {
    case "user_message": {
      const messageText = msg.message;
      return (
        <div className="group space-y-1">
          <EventBubble align="end" variant="user">
            <p className="whitespace-pre-wrap leading-relaxed">{messageText}</p>
          </EventBubble>
        </div>
      );
    }
    case "agent_message": {
      const messageText = msg.message;
      return (
        <div className="space-y-1">
          <div className="flex gap-2">
            <Bot />
            <MarkdownRenderer content={messageText} />
          </div>
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
    case "exec_command_begin":
    case "exec_command_end":
    case "patch_apply_begin":
    case "patch_apply_end":
    case "task_complete":
    case "task_started":
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
