import { useState, useEffect, useRef } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { ConfigDialog } from "@/components/ConfigDialog";
import { ConfigIndicator } from "@/components/ConfigIndicator";
import { DebugPanel } from "@/components/DebugPanel";
import { useChatStore } from "@/store/chatStore";
import { useLayoutStore } from "@/store/layoutStore";
import { useFolderStore } from "@/hooks/useFolderStore";
import { AppHeader } from "@/components/AppHeader";
import { FileTree } from "@/components/FileTree";
import { FileViewer } from "@/components/FileTree/FileViewer";
import { sessionManager } from '../services/sessionManager';

export function Layout() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const initialSessionCreated = useRef(false);

  // Zustand stores
  const {
    config,
    sessions,
    activeSessionId,
    setConfig,
    createSession,
    selectSession,
    closeSession,
  } = useChatStore();

  const {
    isFilePanelVisible,
    isSessionListVisible,
    selectedFile,
    toggleSessionList,
    openFile,
    closeFile,
  } = useLayoutStore();

  const { currentFolder } = useFolderStore();

  // Create initial session if none exists
  useEffect(() => {
    if (sessions.length === 0 && !initialSessionCreated.current) {
      initialSessionCreated.current = true;
      createSession();
    }
  }, [sessions.length, createSession]);

  // Sync session manager with backend periodically
  useEffect(() => {
    const syncInterval = setInterval(() => {
      sessionManager.syncWithBackend();
    }, 2000); // Sync every 2 seconds

    // Initial sync
    sessionManager.syncWithBackend();

    return () => clearInterval(syncInterval);
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentConfig = activeSession?.config || config;

  return (
    <main className="h-screen flex flex-col">
      {/* App Header */}
      <div className="flex-shrink-0">
        <AppHeader />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - File Tree */}
        <div className="w-64 border-r h-full flex-shrink-0">
          <FileTree currentFolder={currentFolder || undefined} onFileClick={openFile} />
        </div>

        {/* Middle Panel - File Content (conditionally visible) */}
        {isFilePanelVisible && selectedFile && (
          <div className="w-96 border-r h-full flex-shrink-0">
            <FileViewer filePath={selectedFile} onClose={closeFile} />
          </div>
        )}

        {/* Right Panel - Chat with Sessions */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Configuration Indicator at top of entire right panel */}
          <div className="flex-shrink-0 border-b bg-white z-20">
            <ConfigIndicator
              config={currentConfig}
              onOpenConfig={() => setIsConfigOpen(true)}
              isSessionListVisible={isSessionListVisible}
              onToggleSessionList={toggleSessionList}
            />
          </div>
          
          {/* Chat Interface with embedded session manager */}
          <div className="flex-1 min-h-0">
            {activeSessionId ? (
              <ChatInterface
                sessionId={activeSessionId}
                config={currentConfig}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onCreateSession={createSession}
                onSelectSession={selectSession}
                onCloseSession={closeSession}
                isSessionListVisible={isSessionListVisible}
              />
            ) : (
              <div className="flex items-center justify-center text-gray-500 h-full">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">Welcome to Codexia</h2>
                  <p>Create a new chat session to get started</p>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>

      {/* Configuration Dialog */}
      <ConfigDialog
        isOpen={isConfigOpen}
        config={config}
        onClose={() => setIsConfigOpen(false)}
        onSave={(newConfig) => {
          setConfig(newConfig);
        }}
      />

      {/* Debug Panel */}
      <DebugPanel />
    </main>
  );
}

