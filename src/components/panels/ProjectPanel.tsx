import { useState, useEffect } from "react";
import { LoaderPinwheel, CreativeCommons, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { Project } from "@/lib/api";
import { api } from "@/lib/api";
import { useNavigationStore } from "@/stores/navigationStore";
import { useFolderStore } from "@/stores/FolderStore";
import { useCodexStore } from "@/stores/codex";
import { useLayoutStore } from "@/stores/settings/layoutStore";
import { invoke } from "@/lib/tauri-proxy";
import { isRemoteRuntime } from "@/lib/tauri-proxy";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";

interface FileSystemProject {
  path: string;
  trust_level: string;
}

interface UnifiedProject {
  path: string;
  hasCodex: boolean;
  hasCC: boolean;
  trustLevel?: string;
  ccProject?: Project;
}

export function ProjectPanel() {
  const [codexProjects, setCodexProjects] = useState<FileSystemProject[]>([]);
  const [ccProjects, setCCProjects] = useState<Project[]>([]);
  const [unifiedProjects, setUnifiedProjects] = useState<UnifiedProject[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const { setSelectedProject, setMainView, setSidebarTab, setSubTab } = useNavigationStore();
  const { setCurrentFolder } = useFolderStore();
  const { setCwd } = useCodexStore();
  const { setFileTree, setChatPane } = useLayoutStore();

  // Load both project lists and scanned projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const [codexList, ccList, scannedList] = await Promise.all([
          invoke<FileSystemProject[]>("read_codex_config").catch(() => []),
          api.listProjects().catch(() => []),
          invoke<Array<{name: string; path: string}>>("get_scanned_projects").catch(() => []),
        ]);

        setCodexProjects(codexList);
        setCCProjects(ccList);

        // Add scanned projects to codex projects (if not already in config)
        const existingPaths = new Set(codexList.map(p => p.path));
        const scannedCodexProjects = scannedList
          .filter(p => !existingPaths.has(p.path))
          .map(p => ({ path: p.path, trust_level: "untrusted" }));

        if (scannedCodexProjects.length > 0) {
          setCodexProjects([...codexList, ...scannedCodexProjects]);
        }
      } catch (error) {
        console.error("Failed to load projects:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Merge projects from both sources
  useEffect(() => {
    const projectMap = new Map<string, UnifiedProject>();

    // Add codex projects
    codexProjects.forEach((project) => {
      projectMap.set(project.path, {
        path: project.path,
        hasCodex: true,
        hasCC: false,
        trustLevel: project.trust_level,
      });
    });

    // Add or merge CC projects
    ccProjects.forEach((project) => {
      const existing = projectMap.get(project.path);
      if (existing) {
        existing.hasCC = true;
        existing.ccProject = project;
      } else {
        projectMap.set(project.path, {
          path: project.path,
          hasCodex: false,
          hasCC: true,
          ccProject: project,
        });
      }
    });

    setUnifiedProjects(Array.from(projectMap.values()));
  }, [codexProjects, ccProjects]);

  const handleCodexClick = (project: UnifiedProject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!project.hasCodex) return;

    setCurrentFolder(project.path);
    setCwd(project.path);
    setFileTree(true);
    setChatPane(true);
    setMainView("codex");
    setSidebarTab("codex");
    setSubTab("main");
  };

  const handleCCClick = (project: UnifiedProject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!project.hasCC || !project.ccProject) return;

    setSelectedProject(project.ccProject);
    setCurrentFolder(project.path);
    setMainView("cc");
    setSidebarTab("cc");
    setSubTab("main");
  };

  const selectNewProject = async () => {
    try {
      if (isRemoteRuntime()) {
        alert("Opening projects is only available from the desktop app.");
        return;
      }

      const result = await open({
        directory: true,
        multiple: false,
      });

      if (result) {
        setCurrentFolder(result);
        setCwd(result);
        setFileTree(true);
        setChatPane(true);
        setMainView("codex");
        setSidebarTab("codex");

        // Reload projects
        const codexList = await invoke<FileSystemProject[]>("read_codex_config").catch(() => []);
        setCodexProjects(codexList);
      }
    } catch (error) {
      console.error("Failed to select directory:", error);
      toast.error("Failed to open project");
    }
  };

  const matchesSearchTerm = (project: UnifiedProject) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;

    const normalizedPath = project.path.toLowerCase();
    if (normalizedPath.includes(term)) return true;

    const folderName = project.path.split(/[/\\]/).pop()?.toLowerCase() ?? "";
    return folderName.includes(term);
  };

  const filteredProjects = unifiedProjects.filter(matchesSearchTerm);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div>Loading projects...</div>
      </div>
    );
  }

  const renderProjectRow = (project: UnifiedProject) => {
    const projectName = project.path.split(/[/\\]/).pop() || project.path;

    return (
      <div
        key={project.path}
        className="p-4 hover:bg-accent/50 transition-colors cursor-pointer rounded-lg"
      >
        <div className="flex items-center justify-between gap-3 min-w-0 mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FolderOpen className="w-5 h-5 flex-shrink-0" />
            <span className="truncate font-medium">{projectName}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant={project.hasCodex ? "ghost" : "ghost"}
              size="icon"
              className={`w-8 h-8 ${
                project.hasCodex
                  ? "hover:bg-primary/10 text-foreground"
                  : "opacity-30 cursor-not-allowed"
              }`}
              onClick={(e) => handleCodexClick(project, e)}
              disabled={!project.hasCodex}
              title={project.hasCodex ? "Open in Codex" : "Not a Codex project"}
            >
              <LoaderPinwheel className="w-4 h-4" />
            </Button>
            <Button
              variant={project.hasCC ? "ghost" : "ghost"}
              size="icon"
              className={`w-8 h-8 ${
                project.hasCC
                  ? "hover:bg-primary/10 text-foreground"
                  : "opacity-30 cursor-not-allowed"
              }`}
              onClick={(e) => handleCCClick(project, e)}
              disabled={!project.hasCC}
              title={project.hasCC ? "Open in Claude Code" : "Not a Claude Code project"}
            >
              <CreativeCommons className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground truncate pl-7">{project.path}</div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex-shrink-0 border-b bg-background px-4 py-3 sm:px-6 sm:py-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Projects</h2>
            <Button onClick={selectNewProject} size="sm" className="w-full sm:w-auto">
              <Plus className="w-3 h-3" />
              Open Project
            </Button>
          </div>
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredProjects.length === 0 ? (
          <div className="p-4 sm:p-6">
            <Card>
              <CardContent className="p-6 text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? "Try a different search term" : "Open a project to get started"}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-1 p-4 sm:p-6">
            {filteredProjects.map((project) => renderProjectRow(project))}
          </div>
        )}
      </div>
    </div>
  );
}
