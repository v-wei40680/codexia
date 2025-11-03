import { useCallback, useState } from "react";
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
// import { useResumeActiveConversation } from "@/hooks/useResumeActiveConversation";
import { Button } from "@/components/ui/button";
import { Files } from "lucide-react";
import { TurnDiffPanel } from "./events/TurnDiffPanel";
import { useTurnDiffStore } from "@/stores/useTurnDiffStore";

export function ChatView() {
  useCodexApprovalRequests();
  const { status: conversationStatus } = useConversation();
  const { activeConversationId } = useActiveConversationStore();
  const { events, addEvent } = useEventStore();
  const { inputValue, setInputValue } = useChatInputStore();
  const [diffPanelOpen, setDiffPanelOpen] = useState(false);
  const addTurnDiff = useTurnDiffStore((s) => s.addDiff);
  const diffsByConversationId = useTurnDiffStore((s) => s.diffsByConversationId);
  const currentEvents = activeConversationId
    ? events[activeConversationId] || []
    : [];
  const { interrupt, isBusy, handleSendMessage } =
    useSendMessage();

  const { tokenUsages } = useTokenCountStore();
  const tokenUsage = activeConversationId ? tokenUsages[activeConversationId] : null;
  const { handleTokenCount } = useTokenCount();

  // useResumeActiveConversation(activeConversationId);

  // Memoize callbacks to prevent unnecessary re-subscriptions
  const handleAnyEvent = useCallback((event: CodexEvent) => {
    if (!activeConversationId) return;
    const { msg } = event.payload.params;
    if (msg.type === "turn_diff") {
      const unified = msg.unified_diff as string | undefined;
      const existing = diffsByConversationId[activeConversationId] || [];
      if (!unified || existing.includes(unified)) {
        return; // duplicate or invalid; skip entirely
      }
      // First add to store, then record event
      addTurnDiff(activeConversationId, unified);
      addEvent(activeConversationId, event);
      return;
    }
    addEvent(activeConversationId, event);
  }, [activeConversationId, addEvent, addTurnDiff, diffsByConversationId]);

  useConversationEvents(activeConversationId, {
    isConversationReady: conversationStatus === "ready",
    onTokenCount: handleTokenCount,
    onAnyEvent: handleAnyEvent,
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
        {(activeConversationId && (diffsByConversationId[activeConversationId]?.length || 0) > 0) ? (
          <div className="px-3 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDiffPanelOpen(true)}
            >
              <Files className="h-4 w-4" />
              File change
            </Button>
          </div>
        ) : null}
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
      <TurnDiffPanel
        open={diffPanelOpen}
        onOpenChange={setDiffPanelOpen}
        conversationId={activeConversationId ?? undefined}
      />
    </div>
  );
}
