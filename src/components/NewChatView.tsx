import { ChatPanel } from "@/components/ChatPanel";
import { useChatSession } from "@/hooks/useChatSession";
import { useChatInputStore } from "@/stores/chatInputStore";

export const NewChatView = () => {
    const {
      textAreaRef,
      activeConversationId,
      activeEvents,
      isSending,
      isInitializing,
      canCompose,
      handleSendMessage,
      handleInterrupt,
      activeHydration,
    } = useChatSession();
    const { inputValue, setInputValue } = useChatInputStore();

    return (
      <ChatPanel
        conversationId={activeConversationId}
        events={activeEvents}
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleSendMessage={handleSendMessage}
        handleInterrupt={handleInterrupt}
        isSending={isSending}
        isInitializing={isInitializing}
        canCompose={canCompose}
        textAreaRef={textAreaRef}
        hydration={activeHydration}
      />
    );
};
