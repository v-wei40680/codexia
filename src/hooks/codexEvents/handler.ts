import type { CodexEvent } from "@/types/codex";
import type { CodexEventHandlerContext, CodexEventHandler } from "./types";
import { sessionHandlers } from "./sessionHandlers";
import { messageHandlers } from "./messageHandlers";
import { approvalHandlers } from "./approvalHandlers";
import { commandHandlers } from "./commandHandlers";

const handlerMap: Record<string, CodexEventHandler> = {
  ...sessionHandlers,
  ...messageHandlers,
  ...approvalHandlers,
  ...commandHandlers,
};

const isSessionMatch = (event: CodexEvent, sessionId: string): boolean => {
  if (!event.session_id) {
    return true;
  }

  const normalized = sessionId.startsWith("codex-event-")
    ? sessionId.replace("codex-event-", "")
    : sessionId;

  return event.session_id === sessionId || event.session_id === normalized;
};

export const handleCodexEvent = (
  event: CodexEvent,
  context: CodexEventHandlerContext,
): void => {
  if (!isSessionMatch(event, context.sessionId)) {
    return;
  }

  const handler = handlerMap[event.msg.type];
  if (handler) {
    handler(event, context);
    return;
  }

  try {
    console.log("Unhandled event");
    console.log(JSON.stringify((event as any).msg ?? event.msg, null, 2));
  } catch (error) {
    console.error(error, event.msg);
  }
};
