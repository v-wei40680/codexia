import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { Toaster } from "sonner";
import { useNavigationStore } from "@/stores/navigationStore";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
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

export function Layout() {
  const { mainView, rightView, setRightView } = useNavigationStore();
  const { webPreviewUrl, setWebPreviewUrl, diffFile } = useLayoutStore();

  return (
    <main className="h-screen flex flex-col">
      {/* App Header */}
      <div className="shrink-0">
        <AppHeader />
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Sidebar */}
        <AppSidebar />

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
              <Panel defaultSize={mainView ? 30 : 100} minSize={20}>
                <div className="h-full overflow-auto">
                  {rightView === "notepad" ? (
                    <div className="p-4">
                      <h2 className="font-semibold mb-4">Notepad</h2>
                      <div className="text-sm text-muted-foreground">
                        Notepad content
                      </div>
                    </div>
                  ) : rightView === "webPreview" ? (
                    <WebPreview
                      url={webPreviewUrl || ""}
                      onClose={() => {
                        setWebPreviewUrl(null);
                        setRightView(null);
                      }}
                      onUrlChange={(url) => setWebPreviewUrl(url)}
                    />
                  ) : null}
                </div>
              </Panel>
            )}
          </PanelGroup>
        </div>
      </div>

      <Toaster />
    </main>
  );
}
