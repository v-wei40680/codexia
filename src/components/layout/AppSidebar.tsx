import {
  LoaderPinwheel,
  BarChart,
  Settings,
  Wrench,
  MessageSquare,
  Files,
  GitBranch,
  Home,
  PenLine,
  CreativeCommons,
  Network,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigationStore } from "@/stores/navigationStore";
import { ChatTab } from "../chat/ChatTab";
import { FileTree } from "../filetree/FileTreeView";
import { useLayoutStore } from "@/stores";
import { useFolderStore } from "@/stores/FolderStore";
import { SourceControl } from "../SourceControl";
import { ClaudeCodeSessionList } from "../cc/SessionList";
import { useCCSessionManager } from "@/hooks/useCCSessionManager";
import { UserDropdown } from "../common/UserDropdown";

type IconKey =
  | "home"
  | "codex"
  | "cc"
  | "codexV2"
  | "mcp"
  | "prompt"
  | "skills"
  | "usage"
  | "learning"
  | "settings";

const ICON_CONFIG: Record<
  IconKey,
  {
    mainView: any;
    sidebarTab?: any;
    subTab?: any;
  }
> = {
  home: { mainView: "home" },
  codex: { mainView: "codex", sidebarTab: "codex", subTab: "main" },
  cc: { mainView: "cc", sidebarTab: "cc", subTab: "main" },
  codexV2: { mainView: "codexV2", sidebarTab: "codexV2", subTab: "main" },
  mcp: { mainView: "mcp", subTab: "main" },
  prompt: { mainView: "prompt", subTab: "main" },
  skills: { mainView: "skills", subTab: "main" },
  usage: { mainView: "usage", subTab: "main" },
  learning: { mainView: "learning", sidebarTab: "learning", subTab: "main" },
  settings: { mainView: "settings", subTab: "main" },
};

interface AppSidebarProps {
  onTabChange?: (view: string) => void;
}

export function AppSidebar({ onTabChange }: AppSidebarProps) {
  const {
    mainView,
    setMainView,
    sidebarTab,
    setSidebarTab,
    subTab,
    setSubTab,
    sidebarVisible,
  } = useNavigationStore();
  const { openFile } = useLayoutStore();
  const { currentFolder } = useFolderStore();
  const { handleSessionSelect } = useCCSessionManager();

  if (!sidebarVisible) {
    return null;
  }

  const handleIconClick = (icon: IconKey) => {
    const config = ICON_CONFIG[icon];

    setMainView(config.mainView);
    setSidebarTab(config.sidebarTab ?? null);
    setSubTab(config.subTab ?? "main");

    onTabChange?.(icon);
  };

  return (
    <div className="flex h-full min-h-0 shrink-0">
      {/* Icon Bar - VS Code Activity Bar */}
      <div className="w-12 bg-background border-r flex flex-col items-center py-2 gap-1">
        <Button
          variant={mainView === "home" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => handleIconClick("home")}
          title="home"
          className="w-10 h-10"
        >
          <Home className="w-5 h-5" />
        </Button>
        <Button
          variant={
            mainView === "codex" && sidebarTab === "codex"
              ? "secondary"
              : "ghost"
          }
          size="icon"
          onClick={() => handleIconClick("codex")}
          title="Codex"
          className="w-10 h-10"
        >
          <LoaderPinwheel className="w-5 h-5" />
        </Button>
        <Button
          variant={
            mainView === "cc" && sidebarTab === "cc"
              ? "secondary"
              : "ghost"
          }
          size="icon"
          onClick={() => handleIconClick("cc")}
          title="cc"
          className="w-10 h-10"
        >
          <CreativeCommons className="w-5 h-5" />
        </Button>
        <Button
          variant={
            mainView === "codexV2" && sidebarTab === "codexV2"
              ? "secondary"
              : "ghost"
          }
          size="icon"
          onClick={() => handleIconClick("codexV2")}
          title="Codex V2"
          className="w-10 h-10 relative group"
        >
          <div className="w-6 h-6 flex items-center justify-center font-bold text-[10px] border-2 border-current rounded-md transition-transform group-hover:scale-110">
            V2
          </div>
        </Button>
        <div className="w-8 h-px bg-border my-1" />
        <Button
          variant={mainView === "prompt" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => handleIconClick("prompt")}
          title="prompt"
          className="w-10 h-10"
        >
          <PenLine className="w-5 h-5" />
        </Button>
        <Button
          variant={mainView === "mcp" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => handleIconClick("mcp")}
          title="MCP"
          className="w-10 h-10"
        >
          <Network className="w-5 h-5" />
        </Button>
        <Button
          variant={mainView === "skills" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => handleIconClick("skills")}
          title="Skills"
          className="w-10 h-10"
        >
          <Wrench className="w-5 h-5" />
        </Button>
        <div className="flex-1" />
        <Button
          variant={mainView === "usage" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => handleIconClick("usage")}
          title="Usage"
          className="w-10 h-10"
        >
          <BarChart className="w-5 h-5" />
        </Button>
        <Button
          variant={
            mainView === "learning" && sidebarTab === "learning"
              ? "secondary"
              : "ghost"
          }
          size="icon"
          onClick={() => handleIconClick("learning")}
          title="Learning"
          className="w-10 h-10"
        >
          <GraduationCap className="w-5 h-5" />
        </Button>
        <UserDropdown />
        <Button
          variant={mainView === "settings" ? "secondary" : "ghost"}
          size="icon"
          onClick={() => handleIconClick("settings")}
          title="Settings"
          className="w-10 h-10"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Content Area - VS Code Sidebar */}
      {(sidebarTab === "codex" || sidebarTab === "cc") && (
        <div className="w-64 bg-background border-r flex flex-col h-full min-h-0">
          {/* Sub-tabs */}
          <div className="flex border-b shrink-0">
            <button
              onClick={() => setSubTab("main")}
              className={`flex-1 px-3 py-2 flex items-center justify-center transition-colors ${subTab === "main"
                ? "bg-background text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
              title={sidebarTab === "codex" ? "codex Sessions" : "cc Sessions"}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSubTab("fileTree")}
              className={`flex-1 px-3 py-2 flex items-center justify-center transition-colors ${subTab === "fileTree"
                ? "bg-background text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
              title="Files"
            >
              <Files className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSubTab("git")}
              className={`flex-1 px-3 py-2 flex items-center justify-center transition-colors ${subTab === "git"
                ? "bg-background text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
              title="Git"
            >
              <GitBranch className="w-4 h-4" />
            </button>
          </div>

          {/* Content based on subTab */}
          {subTab === "main" && (
            <>
              {sidebarTab === "codex" && (
                <div className="flex-1 min-h-0 overflow-auto">
                  <ChatTab />
                </div>
              )}
              {sidebarTab === "cc" && (
                <div className="flex-1 min-h-0 overflow-auto p-2">
                  <ClaudeCodeSessionList onSelectSession={handleSessionSelect} />
                </div>
              )}
            </>
          )}
          {subTab === "fileTree" && (
            <div className="flex-1 min-h-0 overflow-auto">
              <FileTree
                currentFolder={currentFolder || undefined}
                onFileClick={(path) => {
                  openFile(path);
                }}
              />
            </div>
          )}
          {subTab === "git" && (
            <div className="flex-1 min-h-0 overflow-auto">
              <SourceControl />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
