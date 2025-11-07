import { invoke } from "@/lib/tauri-proxy";
import { CodexEvent } from "@/types/chat";

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
      eventJson: JSON.stringify(msg).trim(),
    });
  }
};
