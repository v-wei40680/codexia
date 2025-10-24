import { memo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useApprovalStore } from "@/stores/useApprovalStore";
import type { ConversationEvent } from "@/types/chat";

import { EventBubble } from "./EventBubble";
import { OutputBlock } from "./OutputBlock";
import {
  describeFileChange,
  describeParsedCommand,
  formatAbortReason,
} from "./helpers";
import { PlanDisplay } from "../chat/messages/PlanDisplay";
import { TurnDiffView } from "./TurnDiffView";
import { AccordionMsg } from "./AccordionMsg";

type ExecDecision = "approved" | "approved_for_session" | "denied" | "abort";

export const EventItem = memo(function EventItem({
  event,
  conversationId,
}: {
  event: ConversationEvent;
  conversationId: string | null;
}) {
  console.log("EventItem render", event.id, event.msg.type);
  const { msg } = event;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const execApprovalRequest = useApprovalStore((state) => {
    if (msg.type !== "exec_approval_request") {
      return null;
    }
    const entry = state.execRequests[msg.call_id] ?? null;
    if (!entry) {
      return null;
    }
    if (conversationId && entry.conversationId !== conversationId) {
      return null;
    }
    return entry;
  });
  const removeExecRequest = useApprovalStore((state) => state.removeExecRequest);

  const handleExecDecision = async (decision: ExecDecision) => {
    if (!execApprovalRequest || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await invoke("respond_exec_command_request", {
        requestToken: execApprovalRequest.requestToken,
        decision,
      });
      removeExecRequest(execApprovalRequest.callId);
      const decisionLabel: Record<ExecDecision, string> = {
        approved: "approved",
        approved_for_session: "approved for this session",
        denied: "denied",
        abort: "aborted",
      };
      toast({
        title: "Decision submitted",
        description: `You ${decisionLabel[decision]} the command.`,
      });
    } catch (error) {
      console.error("Failed to send exec approval decision", error);
      const description =
        error instanceof Error ? error.message : String(error);
      toast({
        title: "Failed to send approval",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  switch (msg.type) {
    case "user_message":
      return (
        <EventBubble align="end" variant="user">
          <p className="whitespace-pre-wrap leading-relaxed">
            {msg.message}
          </p>
        </EventBubble>
      );
    case "agent_message":
      return <MarkdownRenderer content={msg.message} />;
    case "agent_reasoning":
    case "agent_reasoning_raw_content":
      return <span className="flex">✨<MarkdownRenderer content={msg.text} /></span>;
    case "exec_approval_request": {
      const commandText = msg.command.join(" ");
      const awaitingDecision = Boolean(execApprovalRequest);
      return (
        <EventBubble
          align="start"
          variant="system"
          title="Command Approval Requested"
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <code className="block whitespace-pre-wrap rounded bg-muted/50 px-2 py-1 font-mono text-xs">
                {commandText}
              </code>
            </div>
            {awaitingDecision && (
              <div className="space-y-3 border-t border-border/50 pt-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleExecDecision("approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={() => handleExecDecision("approved_for_session")}
                  >
                    Approve for session
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleExecDecision("denied")}
                  >
                    Deny
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSubmitting}
                    onClick={() => handleExecDecision("abort")}
                  >
                    Abort turn
                  </Button>
                </div>
                {isSubmitting ? (
                  <div className="text-xs text-muted-foreground">
                    Sending decision…
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </EventBubble>
      );
    }
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
    case "patch_apply_begin": {
      const entries = Object.entries(msg.changes ?? {});
      return (
        <EventBubble
          align="start"
          variant="system"
          title="Applying Patch"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={msg.auto_approved ? "secondary" : "outline"}>
                {msg.auto_approved ? "Auto-approved" : "Pending approval"}
              </Badge>
            </div>
            <div className="space-y-2">
              {entries.length > 0 ? (
                entries.map(([path, change]) => {
                  if (!change) return null;
                  const { label, detail } = describeFileChange(change);
                  return (
                    <div key={path} className="space-y-1 rounded border border-border/60 bg-muted/30 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{label}</Badge>
                        <span className="font-mono text-xs">{path}</span>
                      </div>
                      {detail && (
                        <div className="text-xs text-muted-foreground">
                          {detail}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground">
                  No file changes were included in this patch.
                </div>
              )}
            </div>
          </div>
        </EventBubble>
      );
    }
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
      return null;
    case "agent_reasoning_section_break":
      return null;
    case "plan_update":
      return <PlanDisplay steps={msg.plan} />
    default:
      return <AccordionMsg title={msg.type} content={JSON.stringify(msg, null, 2)} />
  }
});
