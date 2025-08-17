import { ChatComponent } from "@/components/ChatComponent";
import { NotesComponent } from "@/components/NotesComponent";
import { useLayoutStore } from "@/stores/layoutStore";
import { useFolderStore } from "@/stores/FolderStore";
import { FileTree } from "@/components/filetree";
import { FileViewer } from "@/components/filetree/FileViewer";
import { useState } from "react";
import { ConfigDialog } from "@/components/ConfigDialog";
import { ConfigIndicator } from "@/components/ConfigIndicator";
import { useConversationStore } from "@/stores/ConversationStore";

export default function ChatPage() {

  const {
    showFileTree,
    showFilePanel,
    activeTab,
    selectedFile,
    openFile,
    closeFile,
  } = useLayoutStore();

  const {
    config,
    setConfig,
    createConversationWithLatestSession,
  } = useConversationStore();

  const { currentFolder } = useFolderStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // No auto-initialization - let user start conversations manually

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
        <div className="flex flex-col flex-1 min-w-0">
          <ConfigIndicator
            onOpenConfig={() => setIsConfigOpen(true)}
            onCreateNewSession={createConversationWithLatestSession}
          />
          {activeTab === "chat" ? (
            <ChatComponent />
          ) : activeTab === "notes" ? (
            <NotesComponent />
          ) : null}
        </div>
      </div>

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
