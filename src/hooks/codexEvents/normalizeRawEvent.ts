import type { CodexEvent } from "@/types/codex";

type RawCodexEventPayload = {
  type: string;
  session_id: string;
  data: any;
};

export const normalizeRawEvent = (rawEvent: RawCodexEventPayload): CodexEvent | null => {
  if (!rawEvent.data || typeof rawEvent.data !== "object") {
    return null;
  }

  const baseMsg: any = rawEvent.data.msg || rawEvent.data;
  let normalizedMsg: any = baseMsg;

  if (baseMsg && typeof baseMsg === "object") {
    switch (baseMsg.type) {
      case "agent_reasoning":
        if (typeof baseMsg.text === "string" && typeof baseMsg.reasoning !== "string") {
          normalizedMsg = { ...baseMsg, reasoning: baseMsg.text };
        }
        break;
      case "agent_reasoning_delta":
        if (typeof baseMsg.text === "string" && typeof baseMsg.delta !== "string") {
          normalizedMsg = { ...baseMsg, delta: baseMsg.text };
        }
        break;
      case "agent_reasoning_raw_content":
        if (typeof baseMsg.text === "string" && typeof baseMsg.content !== "string") {
          normalizedMsg = { ...baseMsg, content: baseMsg.text };
        }
        break;
      case "agent_message_delta":
        if (typeof baseMsg.text === "string" && typeof baseMsg.delta !== "string") {
          normalizedMsg = { ...baseMsg, delta: baseMsg.text };
        }
        break;
      case "turn_diff":
        if (typeof baseMsg.diff === "string" && typeof baseMsg.unified_diff !== "string") {
          normalizedMsg = { ...baseMsg, unified_diff: baseMsg.diff };
        }
        break;
      default:
        break;
    }
  }

  const eventId = rawEvent.data.id || `raw-${Date.now()}`;

  return {
    id: eventId,
    msg: normalizedMsg,
    session_id: rawEvent.session_id,
  };
};

export type { RawCodexEventPayload };
