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
import { getStreamDurationLabel } from "@/utils/getDurationLable";
import { PatchApplyBeginItem } from "./PatchApplyBeginItem";
import { PatchApplyEndItem } from "./PatchApplyEndItem";

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
          <div className="opacity-0 group-hover:opacity-100 h-0 group-hover:h-auto overflow-hidden transition-all duration-200">
            <MsgFooter content={messageText} align="end" />
          </div>
        </div>
      );
    }
    case "agent_message": {
      const messageText = msg.message;
      return (
        <div className="group space-y-1">
          <div className="flex gap-2">
            <Bot />
            <MarkdownRenderer content={messageText} />
          </div>
          <div className="opacity-0 group-hover:opacity-100 h-0 group-hover:h-auto overflow-hidden transition-all duration-200">
            <MsgFooter
              content={messageText}
              align="start"
              metaInfo={durationLabel}
            />
          </div>
        </div>
      );
    }
    case "agent_reasoning":
    case "agent_reasoning_raw_content":
      return (
        <div className="space-y-1">
          <span className="flex">
            {msg.text.includes("\n") ? (
              (() => {
                const firstNewlineIndex = msg.text.indexOf("\n");
                const title = msg.text.substring(0, firstNewlineIndex);
                const content = msg.text.substring(firstNewlineIndex + 1);
                return <AccordionMsg title={`🧠 ${title}`} content={content} />;
              })()
            ) : (
              <MarkdownRenderer content={`🧠 ${msg.text}`} />
            )}
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
      return (
        <div className="flex">
          <Terminal />
          <MarkdownRenderer content={msg.command.join(" ")} />
        </div>
      );
    case "patch_apply_begin":
      return <PatchApplyBeginItem event={event} />;
    case "patch_apply_end":
      return <PatchApplyEndItem event={event} />;
    case "exec_command_end":
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
