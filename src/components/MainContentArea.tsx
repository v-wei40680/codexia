import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChatInterface } from './ChatInterface';
import { NoteList, NoteEditor } from './notes';
import { ConversationList } from './chat';
import { CodexConfig } from '../types/codex';
import type { Conversation } from '../types/chat';
import { useFolderStore } from '../stores/FolderStore';

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
}) => {
  const [isContinuing, setIsContinuing] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const { currentFolder } = useFolderStore();

  const handleSelectConversation = async (conversation: Conversation) => {
    if (isContinuing) return;

    setIsContinuing(true);
    try {
      console.log('Selecting conversation:', conversation.id);
      
      // Set the selected conversation to be displayed in ChatInterface
      setSelectedConversation(conversation);
      
      // Create a new Codex session for this conversation
      const newSessionId = `history-${conversation.id}-${Date.now()}`;
      
      // Convert camelCase to snake_case for Rust compatibility
      const rustConfig = {
        working_directory: currentFolder || config.workingDirectory,
        model: config.model,
        provider: config.provider,
        use_oss: config.useOss,
        custom_args: config.customArgs,
        approval_policy: config.approvalPolicy,
        sandbox_mode: config.sandboxMode,
        codex_path: config.codexPath,
      };
      
      await invoke('start_codex_session', {
        sessionId: newSessionId,
        config: rustConfig,
      });

      console.log('Switching to new session in ChatInterface');
      // Switch to the new session in ChatInterface
      if (onSelectSession) {
        onSelectSession(newSessionId);
      }
    } catch (error) {
      console.error('Failed to create session for conversation:', error);
      alert(`Failed to open conversation: ${error}`);
    } finally {
      setIsContinuing(false);
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
            historyMessages={selectedConversation?.messages || []}
            onClearHistory={() => setSelectedConversation(null)}
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