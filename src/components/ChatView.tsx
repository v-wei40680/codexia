import { useCallback, useEffect, useMemo, useRef } from "react";
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
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PatchHistorySheetContent } from "./chat/PatchHistorySheetContent";
import { useResumeConversation } from "@/hooks/useResumeConversation";
import { useConversationListStore } from "@/stores/useConversationListStore";
import { useCodexStore } from "@/stores/useCodexStore";
import { usePatchHistory } from "@/hooks/usePatchHistory";

export function ChatView() {
  useCodexApprovalRequests();
  const { status: conversationStatus } = useConversation();
  const { activeConversationId } = useActiveConversationStore();
  const { events, addEvent } = useEventStore();
  const { inputValue, setInputValue } = useChatInputStore();
  const { tokenUsages, clearTokenUsage } = useTokenCountStore();
  const tokenUsage = activeConversationId ? tokenUsages[activeConversationId] : null;
  const { handleTokenCount } = useTokenCount();
  const { handleSelectConversation } = useResumeConversation();
  const { cwd } = useCodexStore();
  const { conversationsByCwd } = useConversationListStore();
  const activeConversationSummary = useMemo(() => {
    if (!activeConversationId) return null;
    const cwdKey = cwd || "";
    const list = conversationsByCwd[cwdKey] ?? [];
    return (
      list.find(
        (conversation) =>
          conversation.conversationId === activeConversationId,
      ) ?? null
    );
  }, [activeConversationId, conversationsByCwd, cwd]);
  const activeConversationPath = activeConversationSummary?.path;
  const lastResumedKeyRef = useRef<string | null>(null);

  const { 
    patchEntries,
    totalFileChanges,
    hasPatchHistory,
    handlePatchApplyBegin,
    handlePatchApplyEnd,
  } = usePatchHistory(activeConversationId);
  const currentEvents = activeConversationId
    ? events[activeConversationId] || []
    : [];
  const { interrupt, isBusy, handleSendMessage } =
    useSendMessage();

  useEffect(() => {
    if (!activeConversationId) {
      lastResumedKeyRef.current = null;
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId || !activeConversationPath) return;
    const resumeKey = `${activeConversationId}:${activeConversationPath}`;
    if (lastResumedKeyRef.current === resumeKey) return;
    lastResumedKeyRef.current = resumeKey;

    const resumeConversation = async () => {
      try {
        clearTokenUsage(activeConversationId);
        await handleSelectConversation(
          activeConversationId,
          activeConversationPath,
        );
      } catch (error) {
        console.error("Failed to resume conversation", error);
        lastResumedKeyRef.current = null;
      }
    };

    void resumeConversation();
  }, [
    activeConversationId,
    activeConversationPath,
    clearTokenUsage,
    handleSelectConversation,
  ]);

  useConversationEvents(activeConversationId, {
    isConversationReady: conversationStatus === "ready",
    onTokenCount: handleTokenCount,
    onAnyEvent: (event: CodexEvent) => {
      if (activeConversationId) {
        addEvent(activeConversationId, event);
      }
    },
    onPatchApplyBegin: handlePatchApplyBegin,
    onPatchApplyEnd: handlePatchApplyEnd,
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
        <div className="border-t border-border/60 bg-background">
          <div className="flex items-center justify-end gap-2 px-4 py-2">
            {hasPatchHistory ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="sm" variant="outline">
                    File changes
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {totalFileChanges}
                    </span>
                  </Button>
                </SheetTrigger>
                <PatchHistorySheetContent entries={patchEntries} />
              </Sheet>
            ) : (
              <Button size="sm" variant="outline" disabled>
                File changes
              </Button>
            )}
          </div>
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
    </div>
  );
}