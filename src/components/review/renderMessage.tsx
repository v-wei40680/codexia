import AgentMessage from "./AgentMessage";
import RoleMessage from "./RoleMessage";
import CommandMessage from "./CommandMessage";
import {
  PlanDisplay,
  PlanStatus,
  SimplePlanStep,
} from "../chat/messages/PlanDisplay";
import type { ReviewMessage } from "@/types/review";
import { AccordionMsg } from "../events/AccordionMsg";

export const renderMessage = (msg: ReviewMessage) => {
  if (
    msg.type === "agent_message" ||
    msg.type === "agent_reasoning" ||
    msg.type === "agent_reasoning_raw_content"
  ) {
    return (
      <AgentMessage
        content={msg.content || ""}
        variant={msg.variant}
        type={msg.type}
      />
    );
  }

  if (msg.variant === "plan") {
    // Map incoming plan shape to PlanDisplay's expected shape.
    const mappedSteps: SimplePlanStep[] = Array.isArray(msg.plan)
      ? msg.plan.map((p) => {
          if (typeof p === "string") {
            return { step: p, status: "pending" as PlanStatus };
          }

          return {
            step: String(
              (p &&
                ((p as any).step ??
                  (p as any).text ??
                  (p as any).description)) ??
                "",
            ),
            status: ((p as any)?.status === "completed"
              ? "completed"
              : (p as any)?.status === "in_progress"
                ? "in_progress"
                : "pending") as PlanStatus,
          };
        })
      : [];

    if (mappedSteps.length === 0) {
      return (
        <article className="message">
          <p className="message__body">No plan data available.</p>
        </article>
      );
    }

    return <PlanDisplay steps={mappedSteps} />;
  }

  if (msg.type === "function_call") {
    return <CommandMessage content={msg.content || ""} variant={msg.variant} />;
  }

  if (msg.type === "function_call_output") {
    return <AccordionMsg content={msg.content || ""} title={msg.title || ""} />;
  }

  if (msg.role === "user" || msg.role === "assistant") {
    return <RoleMessage content={msg.content || ""} role={msg.role} />;
  }

  return (
    <article>
      <p>{msg.content}</p>
    </article>
  );
};
