import { useRef, forwardRef, useImperativeHandle } from "react";
import { useConversationStore } from "@/stores/useConversationStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { useConversationListStore } from "@/stores/useConversationListStore";
import { ConversationList } from "@/components/ConversationList";
import { ChatPanel } from "@/components/ChatPanel";
import { useChatSession } from "@/hooks/useChatSession";

interface NewChatViewProps {
  showChatTabs?: boolean;
}

export const NewChatView = forwardRef<{
  focusChatInput: () => void;
}, NewChatViewProps>(({ showChatTabs = false }, ref) => {
  const chatInputRef = useRef<HTMLInputElement>(null);
  const { messages, currentMessage, setCurrentMessage } =
    useConversationStore();
  const { activeConversationId } = useConversationListStore();
  const { isInitializing } = useSessionStore();
  const { isSending, handleSendMessage } =
    useChatSession();

  const activeMessages = messages[activeConversationId || ""] || [];

  const focusChatInput = () => {
    chatInputRef.current?.focus();
  };

  useImperativeHandle(ref, () => ({
    focusChatInput,
  }));

  if (showChatTabs) {
    return (
      <ConversationList />
    );
  }

  return (
    <ChatPanel
      activeConversationId={activeConversationId}
      activeMessages={activeMessages}
      currentMessage={currentMessage}
      setCurrentMessage={setCurrentMessage}
      handleSendMessage={() => handleSendMessage(currentMessage)}
      isSending={isSending}
      isInitializing={isInitializing}
      inputRef={chatInputRef}
    />
  );
});
