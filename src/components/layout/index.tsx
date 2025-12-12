import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { Toaster } from "sonner";
import { useNavigationStore } from "@/stores/navigationStore";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { FileExplorerPanel, ProjectPanel } from "@/components/panels";
import ChatPage from "@/pages/chat";
import { McpPanel } from "../panels/McpPanel";
import { UsagePanel } from "../panels/UsagePanel";
import { SessionViewer } from "../cc/SessionViewer";
import { ProjectViewErrorBoundary } from "../cc/ProjectViewErrorBoundary";
import { SettingsPanel } from "../panels/SettingsPanel";
import AgentPage from "@/pages/agents";
import ClaudeCodeApp from "@/pages/cc";
import { WebPreview } from "../WebPreview";
import { useLayoutStore } from "@/stores";
import { DiffViewer } from "../filetree/DiffViewer";
import { NoteList, NoteEditor } from "../notes";
import { useNoteStore } from "@/stores/useNoteStore";

export function Layout() {
  const { mainView, rightView, setRightView, setMainView } = useNavigationStore();
  const { webPreviewUrl, setWebPreviewUrl, diffFile } = useLayoutStore();
  const { showNoteList } = useNoteStore();

  const handleTabChange = (view: string) => {
    setMainView(view as any);
  };

  return (
    <main className="h-screen flex flex-col">
      {/* App Header */}
      <div className="shrink-0">
        <AppHeader />
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Sidebar */}
        <AppSidebar onTabChange={handleTabChange} />

        {/* Left/Right Split Layout */}
        <div className="flex-1 min-h-0 flex">
          <PanelGroup direction="horizontal">
            {/* Left Panel - Codex, CC, or FileTree */}
            {mainView && (
              <Panel defaultSize={30} minSize={15}>
                <div className="h-full overflow-auto">
                  {mainView === "codex" && <ChatPage />}
                  {mainView === "cc" && (
                    <ProjectViewErrorBoundary>
                      <SessionViewer />
                    </ProjectViewErrorBoundary>
                  )}
                  {mainView === "project" && <ProjectPanel />}
                  {mainView === "mcp" && <McpPanel />}
                  {mainView === "usage" && <UsagePanel />}
                  {mainView === "fileTree" && <FileExplorerPanel />}
                  {mainView === "git" && (
                    <div className="flex-1 min-w-0 border-r overflow-hidden">
                      {diffFile && (
                        <div className="h-full flex flex-col">
                          <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {diffFile.fileName}
                            </span>
                          </div>
                          <DiffViewer
                            original={diffFile.original}
                            current={diffFile.current}
                            fileName={diffFile.fileName}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {mainView === "settings" && <SettingsPanel />}
                  {mainView === "agents-editor" && <AgentPage />}
                  {mainView === "claude-md-editor" && <AgentPage />}
                  {mainView === "cc-app" && <ClaudeCodeApp />}
                </div>
              </Panel>
            )}

            {/* Resize handle between left and right panels */}
            {mainView && rightView && (
              <PanelResizeHandle className="w-1 bg-border" />
            )}

            {/* Right Panel - Editor or Notepad */}
            {rightView && (
              <Panel defaultSize={mainView ? 70 : 100} minSize={20} className="overflow-hidden">
                {rightView === "notepad" ? (
                  <ResizablePanelGroup direction="horizontal" className="h-full w-full overflow-hidden">
                    {showNoteList && (
                      <>
                        <ResizablePanel id="notepad-list" order={1} defaultSize={30} minSize={0} className="min-w-0 overflow-hidden">
                          <div className="h-full w-full overflow-auto">
                            <NoteList />
                          </div>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                      </>
                    )}
                    <ResizablePanel id="notepad-editor" order={showNoteList ? 2 : 1} defaultSize={showNoteList ? 70 : 100} minSize={50} className="min-w-0 overflow-hidden">
                      <NoteEditor />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                ) : rightView === "webPreview" ? (
                  <div className="h-full overflow-auto">
                    <WebPreview
                      url={webPreviewUrl || ""}
                      onClose={() => {
                        setWebPreviewUrl(null);
                        setRightView(null);
                      }}
                      onUrlChange={(url) => setWebPreviewUrl(url)}
                    />
                  </div>
                ) : null}
              </Panel>
            )}
          </PanelGroup>
        </div>
      </div>

      <Toaster />
    </main>
  );
}
