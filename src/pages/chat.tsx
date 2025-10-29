import { NotesView } from "@/components/NotesView";
import { useLayoutStore } from "@/stores/layoutStore";
import { useFolderStore } from "@/stores/FolderStore";
import { FileTree } from "@/components/filetree/FileTreeView";
import { FileViewer } from "@/components/filetree/FileViewer";
import { useNoteStore } from "@/stores/NoteStore";
import { DiffViewer } from "@/components/filetree/DiffViewer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Files, GitBranch, Bot, NotebookPen } from "lucide-react";
import { AttachedFilesTab } from "@/components/AttachedFilesTab";
import { NoteList } from "@/components/notes";
import { WebPreview } from "@/components/WebPreview";
import { SourceControl } from "@/components/SourceControl";
import { ChatView } from "@/components/ChatView";
import { ChatTab } from "@/components/ChatTab";

export default function ChatPage() {
  const {
    showChatPane,
    showFileTree,
    showFilePanel,
    showWebPreview,
    selectedFile,
    selectedLeftPanelTab,
    webPreviewUrl,
    openFile,
    closeFile,
    setSelectedLeftPanelTab,
    setWebPreviewUrl,
    diffFile,
    closeDiffFile,
  } = useLayoutStore();
  const { currentFolder } = useFolderStore();

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Panel - File Tree and Git Status */}
      {showFileTree && (
        <div className="w-64 border-r h-full flex-shrink-0">
          <Tabs
            value={selectedLeftPanelTab}
            onValueChange={setSelectedLeftPanelTab}
            className="h-full flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="git">
                <GitBranch />
              </TabsTrigger>
              <TabsTrigger value="attached">
                <Files />
              </TabsTrigger>
              <TabsTrigger value="chat">
                <Bot />
              </TabsTrigger>
              <TabsTrigger value="notes">
                <NotebookPen />
              </TabsTrigger>
            </TabsList>
            <TabsContent value="files" className="flex-1 overflow-hidden mt-0">
              <FileTree
                currentFolder={currentFolder || undefined}
                onFileClick={(path) => {
                  console.log("ChatPage: opening file from FileTree", path);
                  closeDiffFile(); // Clear any existing diff view
                  openFile(path);
                }}
              />
            </TabsContent>
            <TabsContent value="git" className="flex-1 overflow-hidden mt-0">
              <SourceControl />
            </TabsContent>
            <TabsContent
              value="attached"
              className="flex-1 overflow-hidden mt-0"
            >
              <AttachedFilesTab />
            </TabsContent>
            <TabsContent value="chat" className="flex-1 overflow-y-auto mt-0">
              <ChatTab />
            </TabsContent>
            <TabsContent value="notes">
              <NoteList />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 h-full flex min-w-0 overflow-hidden">
        {/* Middle Panel - Chat/Notes */}
        {showChatPane && (
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            {selectedLeftPanelTab === "notes" ? (
              <NotesView />
            ) : (
              <ChatView />
            )}
          </div>
        )}

        {/* Right Panel - FileViewer, DiffViewer, or WebPreview */}
        {((showFilePanel && selectedFile) ||
          diffFile ||
          (showWebPreview && webPreviewUrl)) && (
          <div className="flex-1 min-w-0 border-r overflow-hidden">
            {diffFile ? (
              <div className="h-full flex flex-col">
                <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Diff: {diffFile.fileName}
                  </span>
                  <button
                    onClick={() => closeDiffFile()}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
                <DiffViewer
                  original={diffFile.original}
                  current={diffFile.current}
                  fileName={diffFile.fileName}
                />
              </div>
            ) : showWebPreview && webPreviewUrl ? (
              <WebPreview
                url={webPreviewUrl}
                onClose={() => setWebPreviewUrl(null)}
                onUrlChange={(url) => setWebPreviewUrl(url)}
              />
            ) : selectedFile ? (
              <FileViewer
                filePath={selectedFile}
                onClose={closeFile}
                addToNotepad={(content: string, source?: string) => {
                  const {
                    getCurrentNote,
                    addContentToNote,
                    createNoteFromContent,
                  } = useNoteStore.getState();
                  const currentNote = getCurrentNote();

                  if (currentNote) {
                    addContentToNote(currentNote.id, content, source);
                  } else {
                    createNoteFromContent(content, source);
                  }
                }}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
