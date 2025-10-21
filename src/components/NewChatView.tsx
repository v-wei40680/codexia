import { useRef, forwardRef, useImperativeHandle, memo } from "react";
import { useConversationStore } from "@/stores/useConversationStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { useConversationListStore } from "@/stores/useConversationListStore";
import { ConversationList } from "@/components/ConversationList";
import { ChatPanel } from "@/components/ChatPanel";

interface NewChatViewProps {
  showChatTabs?: boolean;
  handleSendMessage: (message: string) => void;
  isSending: boolean;
}

export const NewChatView = forwardRef<{
  focusChatInput: () => void;
}, NewChatViewProps>(({ showChatTabs = false, handleSendMessage, isSending }, ref) => {
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, currentMessage, setCurrentMessage } =
    useConversationStore();
  const { activeConversationId } = useConversationListStore();
  const { isInitializing } = useSessionStore();

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

// Memoize to prevent re‑renders when props that don’t affect the UI stay the same.
export const MemoizedNewChatView = memo(NewChatView, (prev, next) => {
  return (
    prev.showChatTabs === next.showChatTabs &&
    prev.isSending === next.isSending &&
    prev.handleSendMessage === next.handleSendMessage
  );
});
