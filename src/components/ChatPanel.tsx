import { useEffect, useRef, type RefObject } from "react";
import DeltaEventLog from "@/components/DeltaEventLog";
import { EventItem } from "@/components/events/EventItem";
import { ChatInput } from "@/components/chat/ChatInput";
import { Sandbox } from "@/components/config/Sandbox";
import { ProviderModels } from "@/components/config/provider-models";
import { ReasoningEffortSelector } from "@/components/config/ReasoningEffortSelector";
import type { ConversationEvent, EventWithId } from "@/types/chat";

interface ChatPanelProps {
  conversationId: string | null;
  events: ConversationEvent[];
  deltaEvents: EventWithId[];
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSendMessage: (messageOverride?: string) => Promise<void>;
  handleInterrupt: () => Promise<void>;
  isSending: boolean;
  isInitializing: boolean;
  canCompose: boolean;
  textAreaRef: RefObject<HTMLTextAreaElement | null>;
}

export function ChatPanel({
  conversationId,
  events,
  deltaEvents,
  inputValue,
  setInputValue,
  handleSendMessage,
  handleInterrupt,
  isSending,
  isInitializing,
  canCompose,
  textAreaRef,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [events, deltaEvents]);

  const composerDisabled =
    isInitializing || isSending || !canCompose;

  const hasContent = events.length > 0 || deltaEvents.length > 0;
  const shouldShowEmptyState = !conversationId || !hasContent;
  const emptyStateMessage = canCompose
    ? "Send a message to start the conversation."
    : "Choose a project before starting a conversation.";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 space-y-4 overflow-y-auto px-6 py-4"
      >
        {shouldShowEmptyState ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {emptyStateMessage}
          </div>
        ) : (
          <>
            {events.map((event, index) => (
              <EventItem
                key={`${event.id}-${index}`}
                event={event}
                conversationId={conversationId}
              />
            ))}

            {deltaEvents.length > 0 && (
              <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm shadow-sm">
                <div className="text-xs font-medium uppercase text-muted-foreground mb-2">
                  Streaming updates
                </div>
                <DeltaEventLog events={deltaEvents} />
              </div>
            )}
          </>
        )}
      </div>
      <ChatInput
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={(message) => {
          void handleSendMessage(message);
        }}
        disabled={composerDisabled}
        isLoading={isSending}
        placeholderOverride={
          canCompose
            ? "Ask Codex to do anything"
            : "Select a project to start chatting"
        }
        externalRef={textAreaRef}
        onStopStreaming={() => {
          void handleInterrupt();
        }}
      />
      <div className="bg-background">
        <div className="flex flex-wrap items-center gap-2">
          <Sandbox />
          <ProviderModels />
          <ReasoningEffortSelector />
        </div>
      </div>
    </div>
  );
}
