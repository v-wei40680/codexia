import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  TerminalSquare,
  Trash2,
} from "lucide-react";
import type { AppSettings, WorkspaceInfo } from "@/types/codex-v2";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type SettingsViewProps = {
  workspaces: WorkspaceInfo[];
  onClose: () => void;
  onMoveWorkspace: (id: string, direction: "up" | "down") => void;
  onDeleteWorkspace: (id: string) => void;
  appSettings: AppSettings;
  onUpdateAppSettings: (next: AppSettings) => Promise<void>;
};

type SettingsSection = "projects";
type CodexSection = SettingsSection | "codex";

function orderValue(workspace: WorkspaceInfo) {
  const value = workspace.settings.sortOrder;
  return typeof value === "number" ? value : Number.MAX_SAFE_INTEGER;
}

export function SettingsView({
  workspaces,
  onClose,
  onMoveWorkspace,
  onDeleteWorkspace,
  appSettings,
  onUpdateAppSettings,
}: SettingsViewProps) {
  const [activeSection, setActiveSection] = useState<CodexSection>("projects");

  const projects = useMemo(() => {
    return workspaces
      .filter((entry) => (entry.kind ?? "main") !== "worktree")
      .slice()
      .sort((a, b) => {
        const orderDiff = orderValue(a) - orderValue(b);
        if (orderDiff !== 0) {
          return orderDiff;
        }
        return a.name.localeCompare(b.name);
      });
  }, [workspaces]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent size="xl" className="max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex h-full">
          {/* Sidebar */}
          <aside className="w-56 border-r p-2 space-y-1">
            <Button
              variant={activeSection === "projects" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveSection("projects")}
            >
              <LayoutGrid className="h-4 w-4" />
              Projects
            </Button>
            <Button
              variant={activeSection === "codex" ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveSection("codex")}
            >
              <TerminalSquare className="h-4 w-4" />
              Codex
            </Button>
          </aside>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeSection === "projects" && (
              <section className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Projects</h3>
                  <p className="text-sm text-muted-foreground">
                    Reorder your projects and remove unused workspaces.
                  </p>
                </div>

                <div className="space-y-2">
                  {projects.map((workspace, index) => (
                    <div
                      key={workspace.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {workspace.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {workspace.path}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onMoveWorkspace(workspace.id, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onMoveWorkspace(workspace.id, "down")}
                          disabled={index === projects.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteWorkspace(workspace.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {projects.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No projects yet.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeSection === "codex" && (
              <section className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Codex</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure the Codex CLI
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="default-access"
                    className="text-sm font-medium"
                  >
                    Default access mode
                  </label>
                  <select
                    id="default-access"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={appSettings.defaultAccessMode}
                    onChange={(event) =>
                      void onUpdateAppSettings({
                        ...appSettings,
                        defaultAccessMode:
                          event.target.value as AppSettings["defaultAccessMode"],
                      })
                    }
                  >
                    <option value="read-only">Read only</option>
                    <option value="current">On-request</option>
                    <option value="full-access">Full access</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Workspace overrides
                  </div>
                  <div className="space-y-2">
                    {projects.map((workspace) => (
                      <div
                        key={workspace.id}
                        className="rounded-md border p-3"
                      >
                        <div className="font-medium">
                          {workspace.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {workspace.path}
                        </div>
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No projects yet.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
