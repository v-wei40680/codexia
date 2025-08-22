import React from "react";

interface DebugInfoProps {
  conversationListTab: string;
  currentConversationId: string | null;
  historyConversationsCount: number;
  activeConversationsCount: number;
  searchQueries: Record<string, string>;
}

export const DebugInfo: React.FC<DebugInfoProps> = ({
  conversationListTab,
  currentConversationId,
  historyConversationsCount,
  activeConversationsCount,
  searchQueries,
}) => {
  return (
    <div className="relative group">
      <div className="absolute top-0 right-0 p-2 text-xs text-gray-400 group-hover:text-gray-600">
        Debug
      </div>
      <div className="hidden group-hover:block absolute top-6 right-0 z-10 p-2 bg-white border rounded shadow-lg text-xs text-gray-700 w-64">
        <div>
          <strong>Conversation List Tab:</strong> {conversationListTab}
        </div>
        <div>
          <strong>Current Conversation ID:</strong> {currentConversationId || "None"}
        </div>
        <div>
          <strong>History Conversations Count:</strong> {historyConversationsCount}
        </div>
        <div>
          <strong>Active Conversations Count:</strong> {activeConversationsCount}
        </div>
        <div>
          <strong>Search Queries:</strong>
          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(searchQueries, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};
