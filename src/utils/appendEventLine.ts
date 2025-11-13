import { readTextFileLines, BaseDirectory } from '@tauri-apps/plugin-fs';
import { invoke } from "@/lib/tauri-proxy";
import { CodexEvent } from "@/types/chat";
import { EventMsg } from '@/bindings/EventMsg';

export const appendEventLine = async (
  conversationId: string,
  cwd: string,
  event: CodexEvent,
) => {
  const { msg } = event.payload.params;
  const projectPathBase64 = btoa(cwd)
  if (!msg.type.endsWith("_delta") && msg.type !== "token_count" && !msg.type.startsWith("item_")  && !msg.type.startsWith("task_")) {
    await invoke("append_jsonl_file", {
      filePath: `~/.codexia/projects/${projectPathBase64}/${conversationId}.jsonl`,
      eventJson: JSON.stringify(msg).trim().replace(/\u0000/g, ""),
    });
  }
};

export const readEventMessages = async (
  eventsPath: string,
  conversationId: string,
): Promise<CodexEvent[]> => {
  const lines = await readTextFileLines(eventsPath, {
    baseDir: BaseDirectory.Home,
  });
  let currentTurn = -1;
  let eventIdx = 0;
  const baseId = Date.now();
  const events: CodexEvent[] = [];
  const turnDiffMessages = new Set<string>();
  for await (const line of lines) {
    if (!line.trim()) {
      console.warn("Skipping empty line in event log.");
      continue;
    }
    let msg: EventMsg;
    try {
      const cleanedLine = line.replace(/\u0000/g, "");
      msg = JSON.parse(cleanedLine);
    } catch (error) {
      console.error("Failed to parse event message line:", line, error);
      continue;
    }
    if (msg.type === "user_message") {
      currentTurn += 1;
    }
    const turnId = String(currentTurn === -1 ? 0 : currentTurn);
    const persistedEvent: CodexEvent = {
      id: baseId + eventIdx,
      event: "codex:event",
      payload: {
        method: `codex/event/${msg.type}`,
        params: {
          conversationId,
          id: turnId,
          msg,
        },
      },
      meta: {
        persisted: true,
      },
    };

    if (msg.type === "turn_diff") {
      if (!turnDiffMessages.has(msg.unified_diff)) {
        turnDiffMessages.add(msg.unified_diff);
        events.push(persistedEvent);
      }
    } else {
      events.push(persistedEvent);
    }
    eventIdx++;
  }

  return events;
};
