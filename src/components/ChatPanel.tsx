import { useEffect, useRef, type RefObject } from "react";
import { EventItem } from "@/components/events/EventItem";
import { ChatInput } from "@/components/chat/ChatInput";
import { Sandbox } from "@/components/config/Sandbox";
import { ProviderModels } from "@/components/config/provider-models";
import { ReasoningEffortSelector } from "@/components/config/ReasoningEffortSelector";
import type { CodexEvent, MediaAttachment } from "@/types/chat";
import { Loader2 } from "lucide-react";

interface ChatPanelProps {
  conversationId: string | null;
  events: CodexEvent[];
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSendMessage: (messageOverride: string, attachments: MediaAttachment[]) => Promise<void>;
  handleInterrupt: () => Promise<void>;
  isSending: boolean;
  isInitializing: boolean;
  canCompose: boolean;
  textAreaRef: RefObject<HTMLTextAreaElement | null>;
  hydration?: {
    status: "idle" | "loading" | "ready" | "error";
    error?: string;
  };
}

export function ChatPanel({
  conversationId,
  events,
  inputValue,
  setInputValue,
  handleSendMessage,
  handleInterrupt,
  isSending,
  isInitializing,
  canCompose,
  textAreaRef,
  hydration,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [events]);

  const composerDisabled =
    isInitializing || isSending || !canCompose;

  const hydrationStatus = hydration?.status ?? "idle";
  const isHydrating = hydrationStatus === "loading";
  const hydrationError = hydrationStatus === "error" ? hydration?.error ?? null : null;

  const hasContent = events.length > 0;
  const showHistoryLoader = Boolean(conversationId) && !hasContent && isHydrating;
  const shouldShowEmptyState =
    !conversationId || (!hasContent && !isHydrating && !hydrationError);
  const emptyStateMessage = canCompose
    ? "Send a message to start the conversation."
    : "Choose a project before starting a conversation.";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 space-y-4 overflow-y-auto px-6 py-4"
      >
        {showHistoryLoader ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading conversation history…
          </div>
        ) : hydrationError && !hasContent ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Failed to load conversation history.</span>
            <span className="text-xs text-destructive/80">
              {hydrationError}
            </span>
          </div>
        ) : shouldShowEmptyState ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {emptyStateMessage}
          </div>
        ) : (
          <>
            {isHydrating && hasContent ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Syncing previous messages…
              </div>
            ) : null}
            {events.map((event, index) => (
              <div key={`${event.id}-${index}`} className="space-y-2">
                <EventItem event={event} conversationId={conversationId} />
              </div>
            ))}

          </>
        )}
      </div>
      <ChatInput
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={(message, attachments) => {
          void handleSendMessage(message, attachments);
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
