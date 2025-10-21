// Replaced ChatCompose with ChatInput for richer input features
import { ChatInput } from "./chat/ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRef, useEffect } from "react";
import EventLog from "./EventLog";
import DeltaEventLog from "./DeltaEventLog";
import { useDeltaEvents } from "@/hooks/useDeltaEvents";
import { Message } from "@/types/Message";
import { Sandbox } from "./config/Sandbox";
import { ProviderModels } from "./config/provider-models";
import { ReasoningEffortSelector } from "./config/ReasoningEffortSelector";
import { useChatInputStore } from "@/stores/chatInputStore";

interface ChatPanelProps {
  activeConversationId: string | null;
  activeMessages: Message[];
  currentMessage: string;
  setCurrentMessage: (msg: string) => void;
  handleSendMessage: () => void;
  isSending: boolean;
  isInitializing: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function ChatPanel({
  activeConversationId,
  activeMessages,
  // Props kept for compatibility but will be ignored in favor of the shared store
  currentMessage: _unusedCurrentMessage,
  setCurrentMessage: _unusedSetCurrentMessage,
  handleSendMessage,
  isSending,
  isInitializing,
  inputRef,
}: ChatPanelProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const deltaEvents = useDeltaEvents(activeConversationId);
  // Use global chat input store so that notes can append to the same textarea.
  // Sync legacy props with the store for compatibility.
  const { inputValue, setInputValue, setExternalSetter } = useChatInputStore();

  // Keep legacy `currentMessage` / `setCurrentMessage` in sync with store.
  useEffect(() => {
    // Register external setter to update parent state when store changes.
    setExternalSetter(_unusedSetCurrentMessage);
    // Initialize store value from prop if they differ.
    if (_unusedCurrentMessage !== inputValue) {
      setInputValue(_unusedCurrentMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_unusedSetCurrentMessage, setExternalSetter]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [
    activeMessages.length,
    activeMessages[activeMessages.length - 1]?.content,
    activeMessages[activeMessages.length - 1]?.events?.length,
  ]);

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        <div className="flex-1 mb-2 flex flex-col">
          <ScrollArea className="flex-1">
            <div ref={scrollAreaRef}>
              {activeConversationId || activeMessages.length > 0 ? (
                activeMessages.map((msg, idx) => (
                  <div
                    key={String(msg.id) ?? `msg-${idx}`}
                    className={`mb-4 flex items-start gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`w-[90%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                  {msg.role === "assistant" ? (
                    <div className="bg-muted rounded-lg">
                      {/* Render stored events (final messages) */}
                      {msg.events && msg.events.length > 0 && (
                        <EventLog events={msg.events} />
                      )}
                    </div>
                  ) : (
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))
             ) : (
               <div className="flex h-full items-center justify-center text-muted-foreground">
                 Select a conversation or start a new one.
               </div>
             )}
              {/* Render any pending delta events for the active conversation */}
              {activeConversationId && deltaEvents.length > 0 && (
                <DeltaEventLog events={deltaEvents} />
              )}
           </div>
         </ScrollArea>
        </div>
      </main>
      <div className="sticky bottom-0 left-0 right-0 bg-background border-t p-2">
        {/* Chat input with extended capabilities */}
        <ChatInput
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          disabled={isSending || isInitializing}
          isLoading={isSending}
          externalRef={inputRef}
        />
        {/* Additional UI components placed below the input */}
        <div className="flex gap-2 mt-2">
          <Sandbox />
          <ProviderModels />
          <ReasoningEffortSelector />
        </div>
      </div>
    </div>
  );
}
