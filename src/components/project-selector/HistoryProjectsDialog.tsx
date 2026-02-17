import { useEffect, useMemo, useState } from 'react';
import { ProjectSelector } from '@/components/project-selector/ProjectSelector';
import { Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { codexService } from '@/services/codexService';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { getFilename } from '@/utils/getFilename';

export function HistoryProjectsDialog() {
  const { projects, historyProjects, setCwd, addProject } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isContinuing, setIsContinuing] = useState(false);

  const historyOnlyProjects = useMemo(
    () =>
      historyProjects.filter((projectPath) => {
        if (!projectPath) {
          return false;
        }
        return !projects.includes(projectPath);
      }),
    [historyProjects, projects]
  );

  useEffect(() => {
    if (projects.length === 0) {
      setOpen(true);
      return;
    }
    setOpen(false);
  }, [projects.length]);

  useEffect(() => {
    setSelectedProjects((previousProjects) =>
      previousProjects.filter((projectPath) => historyOnlyProjects.includes(projectPath))
    );
  }, [historyOnlyProjects]);

  const toggleSelectedProject = (path: string) => {
    setSelectedProjects((previousProjects) =>
      previousProjects.includes(path)
        ? previousProjects.filter((projectPath) => projectPath !== path)
        : [...previousProjects, path]
    );
  };
  const hasHistoryProjects = historyOnlyProjects.length > 0;
  const allSelected = hasHistoryProjects && selectedProjects.length === historyOnlyProjects.length;
  const isPartiallySelected = selectedProjects.length > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (!hasHistoryProjects) {
      return;
    }
    setSelectedProjects(allSelected ? [] : historyOnlyProjects);
  };

  const handleContinue = async () => {
    if (selectedProjects.length === 0) {
      return;
    }

    try {
      setIsContinuing(true);
      selectedProjects.forEach((path) => addProject(path));
      setCwd(selectedProjects[0]);
      await codexService.setCurrentThread(null);
      setOpen(false);
      setSelectedProjects([]);
    } catch (error) {
      console.error('Failed to continue with selected projects:', error);
    } finally {
      setIsContinuing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (projects.length === 0 && !nextOpen) {
          return;
        }
        setOpen(nextOpen);
      }}
    >
      <DialogContent showCloseButton={projects.length > 0}>
        <DialogHeader>
          <DialogTitle>Select a project</DialogTitle>
          <DialogDescription>
            Codexia will be able to edit files and run commands in selected folders. You can
            select multiple history projects and continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected ? true : isPartiallySelected ? 'indeterminate' : false}
                onCheckedChange={toggleSelectAll}
                disabled={!hasHistoryProjects}
              />
              <span className="text-sm font-medium">Select all</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {selectedProjects.length}/{historyOnlyProjects.length} selected
            </span>
          </div>

          <ScrollArea className="h-64 rounded-md border">
            <div className="p-2">
              {historyOnlyProjects.length === 0 ? (
                <p className="px-2 py-6 text-sm text-muted-foreground">No history projects found.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {historyOnlyProjects.map((projectPath) => (
                    <Button
                      key={projectPath}
                      variant="ghost"
                      className={cn(
                        'h-9 justify-start gap-2 px-2',
                        selectedProjects.includes(projectPath) && 'bg-accent'
                      )}
                      onClick={() => toggleSelectedProject(projectPath)}
                    >
                      <Checkbox
                        checked={selectedProjects.includes(projectPath)}
                        onCheckedChange={() => toggleSelectedProject(projectPath)}
                        onClick={(event) => event.stopPropagation()}
                      />
                      <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{getFilename(projectPath) || projectPath}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-center gap-2">
            <ProjectSelector
              variant="hero"
              className="h-8"
              triggerLabel="Add new project"
              initialMode="browse"
              onProjectSelected={() => setOpen(false)}
            />
            <Button
              variant="ghost"
              className="h-8"
              disabled={selectedProjects.length === 0 || isContinuing}
              onClick={() => void handleContinue()}
            >
              {isContinuing ? 'Continuing...' : 'Continue'}
            </Button>
          </div>

          <div className="flex justify-center">
            <Button
              variant="ghost"
              className="h-8"
              onClick={() => setOpen(false)}
            >
              Skip
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
