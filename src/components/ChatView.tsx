import { useCallback, useEffect, useState } from "react";
import { useConversation, useSendMessage } from "@/hooks/useCodex";
import { ChatCompose } from "./chat/input/ChatCompose";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useCodexApprovalRequests } from "@/hooks/useCodexApprovalRequests";
import { useConversationEvents } from "@/hooks/useCodex/useConversationEvents";
import { ChatToolbar } from "./layout/ChatToolBar";
import { useChatInputStore } from "@/stores/chatInputStore";
import { type CodexEvent } from "@/types/chat";
import { Introduce } from "./common/Introduce";
import { useEventStore } from "@/stores/useEventStore";
import { ChatScrollArea } from "./chat/ChatScrollArea";
import type { TokenUsage } from "@/bindings/TokenUsage";

export function ChatView() {
  useCodexApprovalRequests();
  const { status: conversationStatus } = useConversation();
  const { activeConversationId } = useActiveConversationStore();
  const { events, addEvent } = useEventStore();
  const {inputValue, setInputValue} = useChatInputStore();
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const currentEvents = activeConversationId
    ? events[activeConversationId] || []
    : [];
  const { interrupt, isBusy, handleSendMessage } =
    useSendMessage();

  useEffect(() => {
    if (!activeConversationId) {
      setTokenUsage(null);
    }
  }, [activeConversationId]);

  useConversationEvents(activeConversationId, {
    isConversationReady: conversationStatus === "ready",
    onAnyEvent: (event: CodexEvent) => {
      if (!event.createdAt) {
        event.createdAt = Date.now();
      }
      if (activeConversationId) {
        addEvent(activeConversationId, event);
      }
    },
    onTokenCount: (event) => {
      const msg = event.payload.params.msg;
      if (msg.type !== "token_count") {
        return;
      }

      const usage = msg.info?.total_token_usage ?? null;

      if (usage && typeof usage.total_tokens === "number") {
        setTokenUsage({ ...usage });
      } else {
        setTokenUsage(null);
      }
    },
  });

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
    },
    [setInputValue],
  );

  return (
    <div className="flex flex-col h-full">
      <ChatToolbar />
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {currentEvents.length > 0 ? (
          <ChatScrollArea
            events={currentEvents}
            activeConversationId={activeConversationId ?? undefined}
          />
        ) : (
          <Introduce />
        )}
        <ChatCompose
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onSendMessage={handleSendMessage}
          onStopStreaming={() =>
            activeConversationId && interrupt(activeConversationId)
          }
          isBusy={isBusy}
          tokenUsage={tokenUsage}
        />
      </div>
    </div>
  );
}
