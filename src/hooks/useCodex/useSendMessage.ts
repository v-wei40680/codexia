import { InputItem } from "@/bindings/InputItem";
import { invoke } from "@/lib/tauri-proxy";
import { useState } from "react";

interface SendMessageOptions {}

export function useSendMessage({}: SendMessageOptions) {
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async (conversationId: string, items: InputItem[]) => {
    setIsSending(true);
    try {
      await invoke("send_user_message", {
        params: {
          conversationId,
          items,
        },
      });
    } finally {
      setIsSending(false);
    }
  };

  const interrupt = async (conversationId: string) => {
    await invoke("interrupt_conversation", {
      params: {conversationId},
    });
  };

  return {
    sendMessage,
    interrupt,
    isSending,
  };
}
