import { ConversationList } from "@/components/ConversationList";
import { ChatPanel } from "@/components/ChatPanel";
import { useChatSession } from "@/hooks/useChatSession";

interface NewChatViewProps {
  showChatTabs?: boolean;
}

export const NewChatView = ({ showChatTabs = false }: NewChatViewProps) => {
    const {
      textAreaRef,
      activeConversationId,
      activeEvents,
      activeDeltaEvents,
      currentMessage,
      setCurrentMessage,
      handleSendMessage,
      isSending,
      isInitializing,
      canCompose,
    } = useChatSession();
    if (showChatTabs) {
      return <ConversationList />;
    }

    return (
      <ChatPanel
        conversationId={activeConversationId}
        events={activeEvents}
        deltaEvents={activeDeltaEvents}
        currentMessage={currentMessage}
        setCurrentMessage={setCurrentMessage}
        handleSendMessage={handleSendMessage}
        isSending={isSending}
        isInitializing={isInitializing}
        canCompose={canCompose}
        textAreaRef={textAreaRef}
    />
  );
};