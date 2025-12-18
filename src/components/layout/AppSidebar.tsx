import { useState, useEffect } from "react";
import {
  Bot,
  CreativeCommons,
  Files,
  FolderOpen,
  GitBranch,
  LoaderPinwheel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigationStore } from "@/stores/navigationStore";
import { ChatTab } from "../chat/ChatTab";
import { CCSessionList } from "../cc/CCSessionList";
import { FileTree } from "../filetree/FileTreeView";
import { useLayoutStore } from "@/stores";
import { useFolderStore } from "@/stores/FolderStore";
import { SourceControl } from "../SourceControl";

interface AppSidebarProps {
  onTabChange?: (view: string) => void;
}

export function AppSidebar({ onTabChange }: AppSidebarProps) {
  const { mainView, setMainView, sidebarVisible } = useNavigationStore();
  const { openFile } = useLayoutStore();
  const { currentFolder } = useFolderStore();
  const [localTab, setLocalTab] = useState<string>(mainView || "codex");

  // Sync localTab with mainView when it changes externally (but not for sidebar-only tabs)
  useEffect(() => {
    if (mainView) {
      setLocalTab(mainView);
    }
  }, [mainView]);

  if (!sidebarVisible) {
    return null;
  }

  const handleTabChange = (value: string) => {
    setLocalTab(value);

    // Don't change mainView for fileTree and git - keep them local to sidebar
    if (value === "fileTree" || value === "git") {
      return;
    }

    if (onTabChange) {
      onTabChange(value);
    } else {
      setMainView(value as any);
    }
  };

  return (
    <div className="w-64 bg-background border-r flex flex-col shrink-0 h-full min-h-0">
      <Tabs
        value={localTab}
        onValueChange={handleTabChange}
        className="w-full flex flex-col flex-1 min-h-0"
      >
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="codex" title="Open Codex">
            <LoaderPinwheel className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="cc-app" title="Open CC APP">
            <Bot className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="cc" title="Open CC">
            <CreativeCommons className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="fileTree" title="Open FileTree">
            <Files className="w-4 h-4" />
          </TabsTrigger>
          <TabsTrigger value="git" title="Open git">
            <GitBranch className="w-4 h-4" />
          </TabsTrigger>
        </TabsList>

        {/* Projects Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleTabChange("project")}
          className={`w-full ${mainView === "project" ? "bg-primary/20" : ""}`}
          title="Open Projects"
        >
          <FolderOpen /> Projects
        </Button>

        <div className="w-full h-px bg-border" />

        {/* Content area */}
        <TabsContent value="codex" className="flex-1 min-h-0 m-0">
          <ChatTab />
        </TabsContent>
        <TabsContent value="cc" className="flex-1 min-h-0 m-0 overflow-auto">
          <CCSessionList />
        </TabsContent>
        <TabsContent value="fileTree" className="flex-1 min-h-0 m-0 overflow-auto">
          <FileTree
            currentFolder={currentFolder || undefined}
            onFileClick={(path) => {
              openFile(path);
            }}
          />
        </TabsContent>
        <TabsContent value="git" className="flex-1 min-h-0 m-0 overflow-auto">
          <SourceControl />
        </TabsContent>
        <TabsContent value="cc-app" className="flex-1 min-h-0 m-0" />
      </Tabs>

      {mainView === "project" && (
        <div className="flex-1 min-h-0 overflow-auto w-full mt-2">
          {/* Projects content will be handled by layout/index.tsx */}
        </div>
      )}
    </div>
  );
}
