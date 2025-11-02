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
import { Bot, Terminal } from "lucide-react";
import { MsgFooter } from "../chat/messages/MsgFooter";

const getStreamDurationLabel = (event: CodexEvent): string | null => {
  const durationMs = event.meta?.streamDurationMs;
  if (durationMs === undefined) {
    return null;
  }

  if (durationMs <= 0) {
    return "Stream duration: <0.01s";
  }

  const seconds = durationMs / 1000;
  const formatted =
    seconds >= 10
      ? `${seconds.toFixed(1)}s`
      : seconds >= 1
        ? `${seconds.toFixed(2)}s`
        : `${(durationMs).toFixed(0)}ms`;

  return `Stream duration: ${formatted}`;
};

export const EventItem = memo(function EventItem({
  event,
  conversationId,
}: {
  event: CodexEvent;
  conversationId: string | null;
}) {
  const { msg } = event.payload.params;
  const durationLabel = getStreamDurationLabel(event);
  if (msg.type.endsWith("_delta")) return null;
  switch (msg.type) {
    case "user_message": {
      const messageText = msg.message;
      return (
        <div className="group space-y-1">
          <EventBubble align="end" variant="user">
            <p className="whitespace-pre-wrap leading-relaxed">{messageText}</p>
          </EventBubble>
          <MsgFooter content={messageText} align="end" />
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
          <MsgFooter
            content={messageText}
            align="start"
            metaInfo={durationLabel}
          />
        </div>
      );
    }
    case "agent_reasoning":
    case "agent_reasoning_raw_content":
      return (
        <div className="space-y-1">
          <span className="flex">
            <AccordionMsg title={`🧠 ${msg.text}`} content={msg.text} />
          </span>
          {durationLabel && (
            <p className="text-xs text-muted-foreground">{durationLabel}</p>
          )}
        </div>
      );
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
        <div className="flex gap-2">
          <Badge variant="destructive">{msg.reason}</Badge>
          {formatAbortReason(msg.reason)}
        </div>
      );
    case "turn_diff":
      return <TurnDiffView content={msg.unified_diff} />;
    case "plan_update":
      return <PlanDisplay steps={msg.plan} />;
    case "exec_command_begin":
      return <div className="flex">
          <Terminal />
        <MarkdownRenderer content={msg.command.join(" ")} />
      </div>
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
