import { useEffect } from "react";
import { invoke } from "@/lib/tauri-proxy";
import { ConversationId } from "@/bindings/ConversationId";
import { CodexEvent } from "@/types/chat";

export function useSystemSleepPrevention(
  conversationId: ConversationId | null,
  event: CodexEvent | null,
) {
  useEffect(() => {
    if (!conversationId || !event) return;

    const { msg } = event.payload.params;
    const conversationIdForSleep = event.payload.params.conversationId;

    if (msg.type === "task_started") {
      invoke("prevent_sleep", {
        conversationId: conversationIdForSleep,
      })
        .catch((error) => {
          console.error("Failed to prevent system sleep:", error);
        })
        .finally(() => {
          console.log(`task_started prevent_sleep`, conversationIdForSleep);
        });
    } else if (
      msg.type === "task_complete" ||
      msg.type === "error" ||
      msg.type === "turn_aborted"
    ) {
      invoke("allow_sleep", {
        conversationId: conversationIdForSleep,
      })
        .catch((error) => {
          console.error("Failed to restore system sleep:", error);
        })
        .finally(() => {
          console.log("allow_sleep", conversationIdForSleep);
        });
    }
  }, [conversationId, event]);

  useEffect(() => {
    return () => {
      if (conversationId) {
        invoke("allow_sleep", { conversationId }).catch((error) => {
          console.error("Failed to restore system sleep during cleanup:", error);
        });
      } else {
        invoke("allow_sleep").catch((error) => {
          console.error("Failed to restore system sleep during cleanup:", error);
        });
      }
    };
  }, [conversationId]);
}
