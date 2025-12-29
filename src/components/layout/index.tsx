import { useEffect } from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { Toaster } from "sonner";
import { useNavigationStore } from "@/stores/navigationStore";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import {
  FileExplorerPanel,
  McpPanel,
  SettingsPanel,
  UsagePanel,
} from "@/components/panels";
import ChatView from "@/views/ChatView";
import AgentsView from "@/views/AgentsView";
import { WebPreview } from "../WebPreview";
import { useLayoutStore } from "@/stores";
import { DiffViewer } from "../filetree/DiffViewer";
import LoginView from "@/views/LoginView";
import { SkillsView } from "../skills/SkillsView";
import { HomeView } from "@/views/HomeView";
import { NoteView } from "@/views/NoteView";

export function Layout() {
  const { mainView, rightView, setRightView, setMainView } =
    useNavigationStore();
  const { webPreviewUrl, setWebPreviewUrl, diffFile, selectedFile } =
    useLayoutStore();

  const handleTabChange = (view: string) => {
    setMainView(view as any);
  };

  // Automatically set rightView to "editor" when a file is selected
  useEffect(() => {
    if (selectedFile) {
      setRightView("editor");
    }
  }, [selectedFile, setRightView]);

  // Automatically set rightView to "diff" when a diff file is selected
  useEffect(() => {
    if (diffFile) {
      setRightView("gitDiff");
    }
  }, [diffFile, setRightView]);

  // Allow access without authentication
  const isAuthenticated = true;

  return (
    <main className="h-screen flex flex-col">
      {/* App Header */}
      <div className="shrink-0">
        <AppHeader />
      </div>

      {isAuthenticated ? (
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
                    {mainView === "home" && <HomeView />}
                    {mainView === "codex" && <ChatView />}
                    {mainView === "agents-editor" && <AgentsView />}
                    {mainView === "login" && <LoginView />}
                    {mainView === "prompt" && <NoteView />}
                    {mainView === "mcp" && <McpPanel />}
                    {mainView === "skills" && <SkillsView />}
                    {mainView === "usage" && <UsagePanel />}
                    {mainView === "settings" && <SettingsPanel />}
                  </div>
                </Panel>
              )}

              {/* Resize handle between left and right panels */}
              {mainView && rightView && (
                <PanelResizeHandle className="w-1 bg-border" />
              )}

              {/* Right Panel - Editor or Notepad */}
              {rightView && (
                <Panel
                  defaultSize={mainView ? 70 : 100}
                  minSize={20}
                  className="overflow-hidden"
                >
                  {rightView === "webPreview" ? (
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
                  ) : rightView === "editor" ? (
                    <div className="h-full overflow-auto">
                      <FileExplorerPanel />
                    </div>
                  ) : rightView === "gitDiff" ? (
                    <div className="h-full flex flex-col overflow-hidden">
                      {diffFile && (
                        <>
                          <div className="p-2 border-b bg-muted/50 flex items-center justify-between shrink-0">
                            <span className="text-sm font-medium">
                              {diffFile.fileName}
                            </span>
                          </div>
                          <div className="flex-1 min-h-0 overflow-auto">
                            <DiffViewer
                              original={diffFile.original}
                              current={diffFile.current}
                              fileName={diffFile.fileName}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                </Panel>
              )}
            </PanelGroup>
          </div>
        </div>
      ) : (
        <LoginView />
      )}

      <Toaster />
    </main>
  );
}
