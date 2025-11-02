import { useCallback, useEffect } from "react";
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
import { useTokenCountStore } from "@/stores/useTokenCountStore";
import { useTokenCount } from "@/hooks/useCodex/useTokenCount";

export function ChatView() {
  useCodexApprovalRequests();
  const { status: conversationStatus } = useConversation();
  const { activeConversationId } = useActiveConversationStore();
  const { events, addEvent } = useEventStore();
  const { inputValue, setInputValue } = useChatInputStore();
  const { tokenUsages, clearTokenUsage } = useTokenCountStore();
  const tokenUsage = activeConversationId ? tokenUsages[activeConversationId] : null;
  const { handleTokenCount } = useTokenCount();
  const currentEvents = activeConversationId
    ? events[activeConversationId] || []
    : [];
  const { interrupt, isBusy, handleSendMessage } =
    useSendMessage();

  useEffect(() => {
    if (activeConversationId) {
      clearTokenUsage(activeConversationId);
    }
  }, [activeConversationId, clearTokenUsage]);

  useConversationEvents(activeConversationId, {
    isConversationReady: conversationStatus === "ready",
    onTokenCount: handleTokenCount,
    onAnyEvent: (event: CodexEvent) => {
      if (activeConversationId) {
        addEvent(activeConversationId, event);
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
