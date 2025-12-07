import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCodexStore } from "@/stores/codex";
import { invoke } from "@/lib/tauri-proxy";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { toast } from "sonner";
import { open } from "@tauri-apps/plugin-dialog";

interface Project {
  path: string;
  trust_level: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannedProjects, setScannedProjects] = useState<Project[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [trustDialogOpen, setTrustDialogOpen] = useState(false);
  const [pendingProjectPath, setPendingProjectPath] = useState<string | null>(null);
  const [isVersionControlled, setIsVersionControlled] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { setCurrentFolder } = useFolderStore();
  const { setFileTree, setChatPane } = useLayoutStore();
  const { setCwd } = useCodexStore();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectList = await invoke<Project[]>("read_codex_config");
      setProjects(projectList);
    } catch (error) {
      toast.error(`Failed to load projects: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const scanForUntrustedProjects = async () => {
    setScanError(null);
    setScanLoading(true);
    try {
      const scanned = await invoke<Project[]>("scan_projects");
      setScannedProjects(scanned);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setScanError(message);
      toast.error(`Failed to scan projects: ${message}`);
    } finally {
      setScanLoading(false);
    }
  };

  const openProject = (projectPath: string) => {
    setCurrentFolder(projectPath);
    setCwd(projectPath);
    setFileTree(true);
    setChatPane(true);
    navigate("/chat");
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

  const matchesSearchTerm = (project: Project) => {
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

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-muted-foreground">Manage your Codex projects</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={selectNewProject}>
              <Plus className="w-3 h-3" />
              Open Project
            </Button>
            <Button
              variant="outline"
              onClick={scanForUntrustedProjects}
              disabled={scanLoading}
            >
              {scanLoading ? "Scanning..." : "Scan Untrusted"}
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
        />
      </div>

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground">run codex at project to see them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 grid grid-cols-1 md:grid-cols-2">
          {filteredProjects.map((project, index) => {
            const projectName = project.path.split(/[/\\]/).pop() || project.path;
            return (
              <Card
                key={`${project.path}-${index}`}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openProject(project.path)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-5 h-5" />
                      {projectName}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        project.trust_level === "trusted"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {project.trust_level}
                    </span>
                  </CardTitle>
                  <CardDescription>{project.path}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {filteredScannedProjects.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Untrusted projects</h2>
            <span className="text-sm text-muted-foreground">
              {`Detected ${filteredScannedProjects.length} project${
                filteredScannedProjects.length > 1 ? "s" : ""
              }`}
            </span>
          </div>
          <div className="space-y-3 grid grid-cols-1 md:grid-cols-2">
            {filteredScannedProjects.map((project) => {
              const projectName = project.path.split(/[/\\]/).pop() || project.path;
              return (
                <Card
                  key={project.path}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openProject(project.path)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5" />
                        {projectName}
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                        {project.trust_level === "trusted" ? "trusted" : "untrusted"}
                      </span>
                    </CardTitle>
                    <CardDescription>{project.path}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      )}

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
                try {
                  await invoke("set_project_trust", {
                    path: pendingProjectPath,
                    trustLevel: "trusted",
                  });
                } catch (e) {
                  console.error("Failed to update project trust:", e);
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
