import { useState, useEffect } from "react";
import { SimpleChatComponent } from "@/components/SimpleChatComponent";
import { SimpleNotesComponent } from "@/components/SimpleNotesComponent";
import { ConfigDialog } from "@/components/ConfigDialog";
import { SessionKillManager } from "@/components/SessionKillManager";
import { useConversationStore } from "@/stores/ConversationStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useFolderStore } from "@/stores/FolderStore";
import { FileTree } from "@/components/FileTree";
import { FileViewer } from "@/components/FileTree/FileViewer";
import { sessionManager } from "../services/sessionManager";

export default function ChatPage() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showSessionManager, setShowSessionManager] = useState(false);

  // Zustand stores
  const { config, currentConversationId, setConfig } = useConversationStore();

  const {
    showFileTree,
    showFilePanel,
    activeTab,
    selectedFile,
    openFile,
    closeFile,
  } = useLayoutStore();

  const { currentFolder } = useFolderStore();

  // No auto-initialization - let user start conversations manually

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
        console.warn(
          `High session count detected: ${runningSessions.length} sessions running. This may cause performance issues.`,
        );
      }
    };

    // Check session count every minute
    const checkInterval = setInterval(checkSessionCount, 60000);

    return () => clearInterval(checkInterval);
  }, []);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Panel - File Tree */}
      {showFileTree && (
        <div className="w-64 border-r h-full flex-shrink-0">
          <FileTree
            currentFolder={currentFolder || undefined}
            onFileClick={openFile}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 h-full flex">
        {/* Middle Panel - FileViewer */}
        {showFilePanel && selectedFile && (
          <div className="flex-1 min-w-0 border-r">
            <FileViewer filePath={selectedFile} onClose={closeFile} />
          </div>
        )}

        {/* Right Panel - Chat/Notes */}
        <div className="flex-1 min-w-0">
          {activeTab === "chat" ? (
            <SimpleChatComponent
              sessionId={currentConversationId || ""}
              activeSessionId={currentConversationId || ""}
              onOpenConfig={() => setIsConfigOpen(true)}
              onToggleSessionManager={() =>
                setShowSessionManager(!showSessionManager)
              }
            />
          ) : activeTab === "notes" ? (
            <SimpleNotesComponent
              onOpenConfig={() => setIsConfigOpen(true)}
              onToggleSessionManager={() =>
                setShowSessionManager(!showSessionManager)
              }
            />
          ) : null}
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
