import React from 'react';
import { ChatInterface } from './ChatInterface';
import { NoteList, NoteEditor } from './notes';
import { ConversationList } from './chat';
import { CodexConfig } from '../types/codex';
import type { Conversation } from '../types/chat';

interface MainContentAreaProps {
  activeTab: string;
  sessionId: string;
  config: CodexConfig;
  sessions?: any[];
  activeSessionId?: string;
  onCreateSession?: () => void;
  onSelectSession?: (sessionId: string) => void;
  onCloseSession?: (sessionId: string) => void;
  isSessionListVisible?: boolean;
  isNotesListVisible?: boolean;
  onConversationSelect?: (conversation: Conversation) => void;
  selectedConversation?: Conversation | null;
}

export const MainContentArea: React.FC<MainContentAreaProps> = ({
  activeTab,
  sessionId,
  config,
  sessions,
  activeSessionId,
  onCreateSession,
  onSelectSession,
  onCloseSession,
  isSessionListVisible,
  isNotesListVisible,
  onConversationSelect,
  selectedConversation,
}) => {
  const handleSelectConversation = (conversation: Conversation) => {
    console.log('Selecting conversation:', conversation.id);
    
    // Call the onConversationSelect if provided
    if (onConversationSelect) {
      onConversationSelect(conversation);
    }
    
    // Switch to this conversation's session ID
    if (onSelectSession) {
      onSelectSession(conversation.id);
    }
  };

  if (activeTab === 'chat') {
    return (
      <div className="flex h-full min-h-0">
        {isSessionListVisible && (
          <div className="w-64 border-r h-full overflow-y-auto flex-shrink-0">
            <ConversationList 
              onSelectConversation={onConversationSelect || handleSelectConversation} 
              onCreateNewSession={onCreateSession}
              activeSessionId={sessionId}
            />
          </div>
        )}
        <div className="flex-1 min-h-0 h-full min-w-0">
          <ChatInterface
            sessionId={sessionId}
            config={config}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onCreateSession={onCreateSession}
            onSelectSession={onSelectSession}
            onCloseSession={onCloseSession}
            isSessionListVisible={false}
            selectedConversation={selectedConversation}
          />
        </div>
      </div>
    );
  }

  if (activeTab === 'notes') {
    return (
      <div className="flex h-full min-h-0">
        {isNotesListVisible && (
          <div className="w-64 border-r h-full flex-shrink-0">
            <NoteList />
          </div>
        )}
        <div className="flex-1 min-h-0 h-full min-w-0">
          <NoteEditor />
        </div>
      </div>
    );
  }

  return null;
};