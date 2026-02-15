import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/stores';
import { ccListProjects } from '@/services';

interface McpProjectSelectorProps {
  onProjectChange?: () => void;
  disabled?: boolean;
}

export function McpProjectSelector({ onProjectChange, disabled }: McpProjectSelectorProps) {
  const { cwd, setCwd } = useWorkspaceStore();
  const [projects, setProjects] = useState<string[]>([]);

  const fetchProjects = async () => {
    try {
      const list = await ccListProjects();
      setProjects(list);
    } catch (error) {
      toast.error(`Failed to fetch projects: ${error}`);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const workingDir = cwd || '';

  const handleProjectChange = async (value: string) => {
    setCwd(value);
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
