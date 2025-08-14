import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { ChatInterface } from "@/components/ChatInterface";
import { ConfigDialog } from "@/components/ConfigDialog";
import { ConfigIndicator } from "@/components/ConfigIndicator";
import { DebugPanel } from "@/components/DebugPanel";
import { useChatStore } from "@/store/chatStore";
import { useLayoutStore } from "@/store/layoutStore";
import { useLayoutStore as useLayoutStoreHook } from "@/hooks/useLayoutStore";
import { useFolderStore } from "@/hooks/useFolderStore";
import { AppHeader } from "@/components/AppHeader";
import { FileTree } from "@/components/FileTree";
import { FileViewer } from "@/components/FileTree/FileViewer";
import { sessionManager } from '../services/sessionManager';

export function Layout() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [chatPaneWidth, setChatPaneWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const initialSessionCreated = useRef(false);
  const resizeRef = useRef<HTMLDivElement>(null);

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

  // Import the other layout store for chat/file tree toggles
  const { showChatPane, showFileTree } = useLayoutStoreHook();

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const containerRect = resizeRef.current?.parentElement?.getBoundingClientRect();
    if (!containerRect) return;
    
    const newWidth = containerRect.right - e.clientX;
    const minWidth = 300;
    const maxWidth = containerRect.width - 200;
    
    setChatPaneWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <main className={`h-screen flex flex-col ${isResizing ? 'cursor-col-resize' : ''}`}>
      {/* App Header */}
      <div className="flex-shrink-0">
        <AppHeader />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - File Tree */}
        {showFileTree && (
          <div className="w-64 border-r h-full flex-shrink-0">
            <FileTree currentFolder={currentFolder || undefined} onFileClick={openFile} />
          </div>
        )}

        {/* Middle Panel - Main Content */}
        <div className="flex-1 min-w-0 h-full flex">
          {/* Content Area */}
          <div className="flex-1">
            {isFilePanelVisible && selectedFile ? (
              <FileViewer filePath={selectedFile} onClose={closeFile} />
            ) : (
              <Outlet />
            )}
          </div>

          {/* Right Panel - Chat with Sessions */}
          {showChatPane && (
            <>
              {/* Resize Handle */}
              <div 
                className="w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize flex-shrink-0 relative group"
                onMouseDown={handleMouseDown}
              >
                <div className="absolute inset-0 w-2 -translate-x-0.5 group-hover:bg-blue-200/50" />
              </div>
              
              {/* Chat Panel */}
              <div 
                ref={resizeRef}
                className="flex flex-col min-h-0"
                style={{ width: chatPaneWidth }}
              >
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
            </>
          )}
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

