import { memo } from "react";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { PlanDisplay } from "../chat/messages/PlanDisplay";
import { TurnDiffView } from "./TurnDiffView";
import { AccordionMsg } from "./AccordionMsg";
import { ExecApprovalRequestItem } from "./ExecApprovalRequestItem";
import { ApplyPatchApprovalRequestItem } from "./ApplyPatchApprovalRequestItem";
import { CodexEvent } from "@/types/chat";
import { Dot } from "lucide-react";
import { MsgFooter } from "../chat/messages/MsgFooter";
import { getStreamDurationLabel } from "@/utils/getDurationLable";
import { ExecCommandBeginItem } from "./ExecCommandBeginItem";
import { PatchApplyBeginItem } from "./PatchApplyBeginItem";
import { useTurnDiffStore } from "@/stores/useTurnDiffStore";
import { UserMessage } from "./UserMessage";

export const EventItem = memo(function EventItem({
  event,
  conversationId,
}: {
  event: CodexEvent;
  conversationId: string | null;
}) {
  const { msg } = event.payload.params;
  const durationLabel = getStreamDurationLabel(event);
  const { diffsByConversationId } = useTurnDiffStore();
  const canUndo =
    !!conversationId &&
    (diffsByConversationId[conversationId]?.length || 0) > 0;

  if (msg.type.endsWith("_delta")) return null;
  switch (msg.type) {
    case "user_message": {
      const messageText = msg.message;
      return (
        <UserMessage
          message={messageText}
          conversationId={conversationId}
          canUndo={canUndo}
        />
      );
    }
    case "agent_message": {
      const messageText = msg.message;
      return (
        <div>
          <div className="flex peer items-start">
            <MarkdownRenderer content={messageText} />
          </div>
          <div className="opacity-0 transition-opacity duration-200 peer-hover:opacity-100 hover:opacity-100">
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
        <div className="flex gap-2 items-center">
          <Dot size={12} />
          <span className="flex">
            {msg.text.includes("\n") ? (
              (() => {
                const firstNewlineIndex = msg.text.indexOf("\n");
                const title = msg.text.substring(0, firstNewlineIndex);
                const content = msg.text.substring(firstNewlineIndex + 1);
                return <AccordionMsg title={title} content={content} />;
              })()
            ) : (
              <MarkdownRenderer content={msg.text} />
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
      return <Badge variant="destructive">{msg.reason}</Badge>;
    case "turn_diff":
      return <TurnDiffView content={msg.unified_diff} />;
    case "plan_update":
      return <PlanDisplay steps={msg.plan} />;
    case "exec_command_begin":
      return <ExecCommandBeginItem event={event} />;
    case "patch_apply_begin":
      return <PatchApplyBeginItem event={event} />;
    case "patch_apply_end":
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
    case "stream_error":
      return <Badge variant="destructive">{msg.message}</Badge>;
    default:
      return (
        <AccordionMsg title={msg.type} content={JSON.stringify(msg, null, 2)} />
      );
  }
});
