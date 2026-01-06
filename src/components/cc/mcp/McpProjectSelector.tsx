import { useEffect, useState } from "react";
import { invoke } from "@/lib/tauri-proxy";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFolderStore } from "@/stores/FolderStore";
import { toast } from "sonner";

interface McpProjectSelectorProps {
  onProjectChange?: () => void;
  disabled?: boolean;
}

export function McpProjectSelector({ onProjectChange, disabled }: McpProjectSelectorProps) {
  const { currentFolder, setCurrentFolder } = useFolderStore();
  const [projects, setProjects] = useState<string[]>([]);

  const fetchProjects = async () => {
    try {
      const list = await invoke<string[]>("cc_list_projects");
      setProjects(list);
    } catch (error) {
      toast.error(`Failed to fetch projects: ${error}`);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const workingDir = currentFolder || "";

  const handleProjectChange = async (value: string) => {
    setCurrentFolder(value);
    if (onProjectChange) {
      await onProjectChange();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs">Project:</Label>
      <Select value={workingDir} onValueChange={handleProjectChange} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project} value={project}>
              {project}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

