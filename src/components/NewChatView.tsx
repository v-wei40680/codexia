import { ConversationList } from "@/components/ConversationList";
import { ChatPanel } from "@/components/ChatPanel";
import { useChatSession } from "@/hooks/useChatSession";
import { useChatInputStore } from "@/stores/chatInputStore";

interface NewChatViewProps {
  showChatTabs?: boolean;
}

export const NewChatView = ({ showChatTabs = false }: NewChatViewProps) => {
    const {
      textAreaRef,
      activeConversationId,
      activeEvents,
      activeDeltaEvents,
      isSending,
      isInitializing,
      canCompose,
      handleSendMessage,
    } = useChatSession();
    const { inputValue, setInputValue } = useChatInputStore();
    if (showChatTabs) {
      return <ConversationList />;
    }

    return (
      <ChatPanel
        conversationId={activeConversationId}
        events={activeEvents}
        deltaEvents={activeDeltaEvents}
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleSendMessage={handleSendMessage}
        isSending={isSending}
        isInitializing={isInitializing}
        canCompose={canCompose}
        textAreaRef={textAreaRef}
    />
  );
};