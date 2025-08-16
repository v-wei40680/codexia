import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MainContentArea } from "@/components/MainContentArea";
import { ConfigDialog } from "@/components/ConfigDialog";
import { ConfigIndicator } from "@/components/ConfigIndicator";
import { SessionKillManager } from "@/components/SessionKillManager";
import { useChatStore } from "@/stores/chatStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useFolderStore } from "@/stores/FolderStore";
import { FileTree } from "@/components/FileTree";
import { FileViewer } from "@/components/FileTree/FileViewer";
import { sessionManager } from '../services/sessionManager';
import type { Conversation } from '@/types/chat';

export default function ChatPage() {
  const { showFileTree } = useLayoutStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const initialSessionCreated = useRef(false);

  // Zustand stores
  const {
    config,
    sessions,
    activeSessionId,
    setConfig,
    createSession,
    selectSession,
    selectOrCreateExternalSession,
    closeSession,
  } = useChatStore();

  const {
    showFilePanel,
    showSessionList,
    showNotesList,
    selectedFile,
    toggleSessionList,
    toggleNotesList,
    openFile,
    closeFile,
  } = useLayoutStore();

  const { currentFolder } = useFolderStore();

  // Create initial session using latest codex session ID if available
  useEffect(() => {
    const initializeSession = async () => {
      if (sessions.length === 0 && !initialSessionCreated.current) {
        initialSessionCreated.current = true;
        
        try {
          // Try to get the latest codex session ID
          const latestSessionId = await invoke<string | null>('get_latest_session_id');
          
          if (latestSessionId) {
            console.log('Using latest codex session ID:', latestSessionId);
            // Select or create the codex session
            selectOrCreateExternalSession(latestSessionId, 'Latest Codex Session');
          } else {
            console.log('No codex session found, creating new session');
            // Create a new session if no codex session exists
            createSession();
          }
        } catch (error) {
          console.error('Failed to get latest session ID, creating new session:', error);
          createSession();
        }
      }
    };
    
    initializeSession();
  }, [sessions.length, createSession, selectOrCreateExternalSession]);

  // Sync session manager with backend - less frequent to reduce CPU usage
  useEffect(() => {
    // Initial sync
    sessionManager.syncWithBackend();
    
    // Sync every 10 seconds instead of 2 seconds to reduce CPU load
    const syncInterval = setInterval(() => {
      sessionManager.syncWithBackend();
    }, 10000); // Sync every 10 seconds

    return () => clearInterval(syncInterval);
  }, []);
  
  // Auto-cleanup: Warn when too many sessions are running
  useEffect(() => {
    const checkSessionCount = async () => {
      await sessionManager.syncWithBackend();
      const runningSessions = sessionManager.getRunningSessions();
      
      if (runningSessions.length > 3) {
        console.warn(`High session count detected: ${runningSessions.length} sessions running. This may cause performance issues.`);
      }
    };
    
    // Check session count every minute
    const checkInterval = setInterval(checkSessionCount, 60000);
    
    return () => clearInterval(checkInterval);
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentConfig = activeSession?.config || config;

  // Handle conversation selection from history
  const handleConversationSelect = (conversation: Conversation) => {
    console.log('Selecting conversation in chat.tsx:', conversation.id, conversation.title);
    
    // Store the selected conversation data
    setSelectedConversation(conversation);
    
    // Switch to this conversation's session ID
    selectOrCreateExternalSession(conversation.id, conversation.title);
  };

  // Clear selected conversation when activeSessionId changes (unless it's the same conversation)
  useEffect(() => {
    if (selectedConversation && activeSessionId !== selectedConversation.id) {
      setSelectedConversation(null);
    }
  }, [activeSessionId, selectedConversation]);


  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Panel - File Tree */}
      {showFileTree && (
        <div className="w-64 border-r h-full flex-shrink-0">
          <FileTree currentFolder={currentFolder || undefined} onFileClick={openFile} />
        </div>
      )}

      {/* Right Panel - Main Content Area */}
      <div className="flex-1 min-h-0 h-full flex flex-col">
        {/* Configuration Indicator */}
        <ConfigIndicator
          config={currentConfig}
          onOpenConfig={() => setIsConfigOpen(true)}
          isSessionListVisible={showSessionList}
          onToggleSessionList={toggleSessionList}
          isNotesListVisible={showNotesList}
          onToggleNotesList={toggleNotesList}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onToggleSessionManager={() => setShowSessionManager(!showSessionManager)}
        />
        
        {/* Main Content Area */}
        <div className="flex-1 min-h-0 flex">
          {showFilePanel && selectedFile ? (
            <>
              {/* Middle Panel - FileViewer */}
              <div className="flex-1 min-w-0 border-r">
                <FileViewer filePath={selectedFile} onClose={closeFile} />
              </div>
              
              {/* Right Panel - MainContentArea */}
              <div className="flex-1 min-w-0">
                {activeTab === 'chat' ? (
                  activeSessionId ? (
                    <MainContentArea
                      activeTab={activeTab}
                      sessionId={activeSessionId}
                      config={currentConfig}
                      sessions={sessions}
                      activeSessionId={activeSessionId}
                      onCreateSession={createSession}
                      onSelectSession={selectOrCreateExternalSession}
                      onCloseSession={closeSession}
                      isSessionListVisible={showSessionList}
                      isNotesListVisible={showNotesList}
                      onConversationSelect={handleConversationSelect}
                      selectedConversation={selectedConversation}
                    />
                  ) : (
                    <div className="flex items-center justify-center text-gray-500 h-full">
                      <div className="text-center">
                        <h2 className="text-xl font-semibold mb-2">Welcome to Codexia</h2>
                        <p>Create a new chat session to get started</p>
                      </div>
                    </div>
                  )
                ) : activeTab === 'notes' ? (
                  <MainContentArea
                    activeTab={activeTab}
                    sessionId={activeSessionId ?? ''}
                    config={currentConfig}
                    sessions={sessions}
                    activeSessionId={activeSessionId ?? undefined}
                    onCreateSession={createSession}
                    onSelectSession={selectSession}
                    onCloseSession={closeSession}
                    isSessionListVisible={showSessionList}
                    isNotesListVisible={showNotesList}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex-1 min-w-0">
              {activeTab === 'chat' ? (
                activeSessionId ? (
                  <MainContentArea
                    activeTab={activeTab}
                    sessionId={activeSessionId}
                    config={currentConfig}
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    onCreateSession={createSession}
                    onSelectSession={selectOrCreateExternalSession}
                    onCloseSession={closeSession}
                    isSessionListVisible={showSessionList}
                    isNotesListVisible={showNotesList}
                    onConversationSelect={handleConversationSelect}
                    selectedConversation={selectedConversation}
                  />
                ) : (
                  <div className="flex items-center justify-center text-gray-500 h-full">
                    <div className="text-center">
                      <h2 className="text-xl font-semibold mb-2">Welcome to Codexia</h2>
                      <p>Create a new chat session to get started</p>
                    </div>
                  </div>
                )
              ) : activeTab === 'notes' ? (
                <MainContentArea
                  activeTab={activeTab}
                  sessionId={activeSessionId ?? ''}
                  config={currentConfig}
                  sessions={sessions}
                  activeSessionId={activeSessionId ?? undefined}
                  onCreateSession={createSession}
                  onSelectSession={selectSession}
                  onCloseSession={closeSession}
                  isSessionListVisible={showSessionList}
                  isNotesListVisible={showNotesList}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Session Kill Manager Dialog */}
      <SessionKillManager 
        isOpen={showSessionManager}
        onClose={() => setShowSessionManager(false)}
      />

      {/* Configuration Dialog */}
      <ConfigDialog
        isOpen={isConfigOpen}
        config={config}
        onClose={() => setIsConfigOpen(false)}
        onSave={(newConfig) => {
          setConfig(newConfig);
        }}
      />
    </div>
  );
}