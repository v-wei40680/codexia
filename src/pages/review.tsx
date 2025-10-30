import { ReviewConversationList } from "@/components/ReviewConversationList";
import SessionView from "@/components/Review";
import { useState } from "react";
import { ConversationSummary } from "@/bindings/ConversationSummary";
import { useSessionStore } from "@/stores/useSessionStore";
import { useConversationListStore } from "@/stores/useConversationListStore";

export default function SessionPage() {
  const [activeSummary, setActiveSummary] =
    useState<ConversationSummary | null>(null);
  const { activeSessionConversationId, setActiveSessionConversationId } =
    useSessionStore();
  const { conversationsByCwd, conversationIndex } = useConversationListStore();

  const handleSelectSession = (conversationId: string) => {
    setActiveSessionConversationId(conversationId);
    const cwdForConversation = conversationIndex[conversationId];
    const list = cwdForConversation
      ? (conversationsByCwd[cwdForConversation] ?? [])
      : [];
    const summary =
      list.find((item) => item.conversationId === conversationId) ?? null;
    setActiveSummary(summary);
  };

  return (
    <div className="flex">
      <ReviewConversationList
        activeSessionConversationId={activeSessionConversationId}
        onSelectSessionConversation={handleSelectSession}
      />
      <SessionView summary={activeSummary} />
    </div>
  );
}
