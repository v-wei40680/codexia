import {
  Bot,
  CreativeCommons,
  Files,
  FolderOpen,
  GitBranch,
  LoaderPinwheel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigationStore } from "@/stores/navigationStore";
import { ChatTab } from "../chat/ChatTab";
import { SessionList } from "../cc/SessionList";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Session, Project } from "@/lib/api";
import { FileTree } from "../filetree/FileTreeView";
import { useLayoutStore } from "@/stores";
import { useFolderStore } from "@/stores/FolderStore";
import { SourceControl } from "../SourceControl";

export function AppSidebar() {
  const {
    mainView,
    setMainView,
    sidebarVisible,
    selectedProject,
    setSelectedProject,
  } = useNavigationStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [ccProjects, setCCProjects] = useState<Project[]>([]);
  const { openFile } = useLayoutStore();
  const { currentFolder } = useFolderStore();

  // Load CC projects once for synchronization
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projects = await api.listProjects();
        setCCProjects(projects);
      } catch (err) {
        console.error("Failed to load projects for sync:", err);
      }
    };
    loadProjects();
  }, []);

  // Synchronize selectedProject and currentFolder
  // When currentFolder changes, find matching project and set it
  useEffect(() => {
    if (!currentFolder) {
      return;
    }

    if (selectedProject && selectedProject.path === currentFolder) {
      // Already in sync
      return;
    }

    // Find project that matches currentFolder
    const matchingProject = ccProjects.find((p) => p.path === currentFolder);
    if (matchingProject && selectedProject?.id !== matchingProject.id) {
      setSelectedProject(matchingProject);
    } else if (!matchingProject && selectedProject) {
      // currentFolder doesn't match any project, clear selection
      setSelectedProject(null);
    }
  }, [currentFolder, ccProjects, selectedProject, setSelectedProject]);

  // Load sessions when project is selected
  useEffect(() => {
    if (!selectedProject) {
      setSessions([]);
      return;
    }

    const loadSessions = async () => {
      try {
        const sessionList = await api.getProjectSessions(selectedProject.id);
        setSessions(sessionList);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      }
    };

    loadSessions();
  }, [selectedProject]);

  if (!sidebarVisible) {
    return null;
  }

  return (
    <div className="w-64 bg-background border-r flex flex-col py-2 items-center shrink-0 h-full min-h-0">
      <span className="flex">
        {/* Codex Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMainView("codex")}
          className={`${mainView === "codex" ? "bg-primary/20" : ""}`}
          title="Open Codex"
        >
          <LoaderPinwheel />
        </Button>

        {/* CC Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMainView("cc-app")}
          className={`${mainView === "cc-app" ? "bg-primary/20" : ""}`}
          title="Open CC APP"
        >
          <Bot />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMainView("cc")}
          className={`${mainView === "cc" ? "bg-primary/20" : ""}`}
          title="Open CC"
        >
          <CreativeCommons />
        </Button>

        {/* FileTree Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMainView("fileTree")}
          className={`${mainView === "fileTree" ? "bg-primary/20" : ""}`}
          title="Open FileTree"
        >
          <Files className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMainView("git")}
          className={`${mainView === "git" ? "bg-primary/20" : ""}`}
          title="Open git"
        >
          <GitBranch className="w-4 h-4" />
        </Button>
      </span>

      {/* Divider */}
      <div className="w-full h-px bg-border my-1" />

      {/* Projects Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMainView(mainView === "project" ? null : "project")}
        className={`w-full ${mainView === "project" ? "bg-primary/20" : ""}`}
        title="Open Projects"
      >
        <FolderOpen className="w-4 h-4" /> Projects
      </Button>

      <div className="w-full h-px bg-border my-1" />

      {/* Content area */}
      {mainView === "codex" && <ChatTab />}
      {mainView === "cc" && (selectedProject || currentFolder) && (
        <div className="w-full mt-2 overflow-auto flex-1">
          <SessionList
            sessions={sessions}
            projectPath={currentFolder || selectedProject?.path || ""}
          />
        </div>
      )}
      {mainView === "fileTree" && (
        <div className="w-full mt-2 overflow-auto flex-1 min-h-0">
          <FileTree
            currentFolder={currentFolder || undefined}
            onFileClick={(path) => {
              openFile(path);
            }}
          />
        </div>
      )}
      {mainView === "git" && (
        <div className="w-full mt-2 overflow-auto flex-1 min-h-0">
          <SourceControl />
        </div>
      )}
    </div>
  );
}
