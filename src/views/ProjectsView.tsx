import { useState, useEffect } from "react";
import { useCodexStore } from "@/stores/codex";
import { useNavigationStore } from "@/stores/navigationStore";
import { invoke } from "@/lib/tauri-proxy";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { FolderOpen, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFolderStore } from "@/stores/FolderStore";
import { Button } from "@/components/ui/button";
import { useLayoutStore } from "@/stores/settings/layoutStore";
import { isRemoteRuntime } from "@/lib/tauri-proxy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { open } from "@tauri-apps/plugin-dialog";
import { Badge} from "@/components/ui/badge"
import { api } from "@/lib/api";
import type { Project as APIProject } from "@/lib/api";
import { usePageView, useTrackEvent } from "@/hooks";

interface FileSystemProject {
  path: string;
  trust_level: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<FileSystemProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannedProjects, setScannedProjects] = useState<FileSystemProject[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [trustDialogOpen, setTrustDialogOpen] = useState(false);
  const [pendingProjectPath, setPendingProjectPath] = useState<string | null>(null);
  const [isVersionControlled, setIsVersionControlled] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("trusted");
  const [ccProjects, setCCProjects] = useState<APIProject[]>([]);
  const { setCurrentFolder } = useFolderStore();
  const { setFileTree, setChatPane } = useLayoutStore();
  const { setCwd } = useCodexStore();
  const { setMainView, setSelectedProject } = useNavigationStore();

  const trackEvent = useTrackEvent();
  usePageView("projects_list");

  useEffect(() => {
    loadProjects();
    loadCCProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectList = await invoke<FileSystemProject[]>("read_codex_config");
      setProjects(projectList);
    } catch (error) {
      toast.error(`Failed to load projects: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCCProjects = async () => {
    try {
      const projectList = await api.listProjects();
      setCCProjects(projectList);
    } catch (error) {
      console.error("Failed to load CC projects:", error);
    }
  };

  const scanForUntrustedProjects = async () => {
    setScanError(null);
    setScanLoading(true);
    trackEvent.featureUsed("projects_list", "scan_untrusted");
    try {
      const scanned = await invoke<FileSystemProject[]>("scan_projects");
      setScannedProjects(scanned);
      trackEvent.featureUsed("projects_list", "scan_completed", {
        found_count: scanned.length
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setScanError(message);
      toast.error(`Failed to scan projects: ${message}`);
      trackEvent.errorOccurred("project_scan_failed", undefined, "projects_list");
    } finally {
      setScanLoading(false);
    }
  };

  const openProject = (projectPath: string) => {
    setCurrentFolder(projectPath);

    // Find matching CC project and set it
    const matchingProject = ccProjects.find(p => p.path === projectPath);
    if (matchingProject) {
      setSelectedProject(matchingProject);
    }

    setCwd(projectPath);
    setFileTree(true);
    setChatPane(true);
    setMainView("codex");

    trackEvent.featureUsed("projects_list", "project_opened", {
      has_cc_project: !!matchingProject,
    });
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
        try {
          const vcs = await invoke<boolean>("is_version_controlled", { path: result });
          setPendingProjectPath(result);
          setIsVersionControlled(Boolean(vcs));
          if (vcs) {
            setTrustDialogOpen(true);
          } else {
            openProject(result);
          }
        } catch (e) {
          console.error("Failed to detect VCS:", e);
          openProject(result);
        }
      }
    } catch (error) {
      console.error("Failed to select directory:", error);
    }
  };

  const matchesSearchTerm = (project: FileSystemProject) => {
    const term = searchTerm.toLowerCase();
    if (!term) {
      return true;
    }
    const normalizedPath = project.path.toLowerCase();
    if (normalizedPath.includes(term)) {
      return true;
    }
    const folderName = project.path.split(/[/\\]/).pop()?.toLowerCase() ?? "";
    return folderName.includes(term);
  };

  const filteredProjects = projects.filter(matchesSearchTerm);
  const existingProjectPaths = new Set(projects.map((project) => project.path));
  const filteredScannedProjects = scannedProjects
    .filter((project) => !existingProjectPaths.has(project.path))
    .filter(matchesSearchTerm);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div>Loading projects...</div>
      </div>
    );
  }

  const renderProjectCard = (project: FileSystemProject, isTrusted: boolean) => {
    const projectName = project.path.split(/[/\\]/).pop() || project.path;
    const badgeLabel = isTrusted ? project.trust_level : "untrusted";
    const badgeColor = isTrusted ? "bg-green-500" : "bg-yellow-100 text-yellow-800";

    return (
      <div
        key={project.path}
        className="p-4 hover:shadow-md transition-shadow cursor-pointer rounded-lg"
        onClick={() => openProject(project.path)}
      >
        <div className="flex items-center justify-between gap-3 min-w-0 mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FolderOpen className="w-5 h-5 flex-shrink-0" />
            <span className="truncate font-medium">{projectName}</span>
          </div>
          <Badge className={`${badgeColor} flex-shrink-0`}>
            {badgeLabel}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground truncate">{project.path}</div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header with controls */}
      <div className="flex-shrink-0 border-b bg-background px-4 py-3 sm:px-6 sm:py-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
              <Button onClick={selectNewProject} size="sm" className="w-full sm:w-auto">
                <Plus className="w-3 h-3" />
                Open Project
              </Button>
              <Button
                variant="outline"
                onClick={scanForUntrustedProjects}
                disabled={scanLoading}
                size="sm"
                className="w-full sm:w-auto text-xs"
              >
                {scanLoading ? "Scanning..." : "Scan out of ~/.codex/config.toml"}
              </Button>
            </div>
          </div>
          {scanError ? (
            <p className="text-destructive text-xs">{`Failed to scan untrusted projects: ${scanError}`}</p>
          ) : null}
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="text-sm"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {filteredProjects.length === 0 && filteredScannedProjects.length === 0 ? (
          <div className="h-full overflow-auto p-4 sm:p-6">
            <Card>
              <CardContent className="p-6 text-center">
                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                <p className="text-muted-foreground">run codex at project to see them here.</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            trackEvent.featureUsed("projects_list", "tab_switch", { tab: value });
          }} className="flex flex-col h-full overflow-hidden">
            {/* Tabs List */}
            <div className="flex-shrink-0 border-b bg-background px-4 sm:px-6">
              <TabsList className="w-full justify-start rounded-none border-0 bg-transparent p-0 h-auto gap-0">
                {filteredProjects.length > 0 && (
                  <TabsTrigger
                    value="trusted"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-3 sm:px-4 py-3 text-sm font-medium"
                  >
                    Trusted ({filteredProjects.length})
                  </TabsTrigger>
                )}
                {filteredScannedProjects.length > 0 && (
                  <TabsTrigger
                    value="untrusted"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-3 sm:px-4 py-3 text-sm font-medium"
                  >
                    Untrusted ({filteredScannedProjects.length})
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 overflow-hidden">
              {filteredProjects.length > 0 && (
                <TabsContent value="trusted" className="h-full overflow-auto m-0">
                  <div className="space-y-2 p-4 sm:p-6 pb-6">
                    {filteredProjects.map((project) => renderProjectCard(project, true))}
                  </div>
                </TabsContent>
              )}

              {filteredScannedProjects.length > 0 && (
                <TabsContent value="untrusted" className="h-full overflow-auto m-0">
                  <div className="space-y-2 p-4 sm:p-6 pb-6">
                    {filteredScannedProjects.map((project) => renderProjectCard(project, false))}
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        )}
      </div>

      <Dialog open={trustDialogOpen} onOpenChange={setTrustDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Trust This Project?</DialogTitle>
            <DialogDescription>
              {`Since this folder is version controlled, you may wish to allow Codex to work in this folder without asking for approval.`}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {pendingProjectPath && isVersionControlled ? (
              <>
                {"\n  1. Yes, allow Codex to work in this folder without asking for approval\n  2. No, ask me to approve edits and commands"}
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                trackEvent.featureUsed("projects_list", "trust_declined");
                const path = pendingProjectPath;
                setTrustDialogOpen(false);
                setPendingProjectPath(null);
                if (path) {
                  openProject(path);
                }
              }}
            >
              No, ask me to approve
            </Button>
            <Button
              onClick={async () => {
                if (!pendingProjectPath) return;
                trackEvent.featureUsed("projects_list", "trust_granted");
                try {
                  await invoke("set_project_trust", {
                    path: pendingProjectPath,
                    trustLevel: "trusted",
                  });
                } catch (e) {
                  console.error("Failed to update project trust:", e);
                  trackEvent.errorOccurred("project_trust_failed", undefined, "projects_list");
                } finally {
                  const path = pendingProjectPath;
                  setTrustDialogOpen(false);
                  setPendingProjectPath(null);
                  if (path) {
                    openProject(path);
                  }
                }
              }}
            >
              Yes, allow without approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
