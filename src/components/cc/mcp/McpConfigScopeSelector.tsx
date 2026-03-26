import { McpProjectSelector } from './McpProjectSelector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface McpConfigScopeSelectorProps {
  selectedScope: string;
  onScopeChange: (scope: string) => void;
  onProjectChange?: () => void;
  disabled?: boolean;
}

export function McpConfigScopeSelector({
  selectedScope,
  onScopeChange,
  onProjectChange,
  disabled
}: McpConfigScopeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Scope Selection */}
      <Select value={selectedScope} onValueChange={onScopeChange} disabled={disabled}>
        <SelectTrigger className="w-full h-10 bg-background/50 backdrop-blur-sm border-muted-foreground/20 hover:border-primary/50 transition-colors">
          <SelectValue placeholder="Select Scope" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="local">Local (This Project Only)</SelectItem>
          <SelectItem value="project">Project (Shared in .mcp.json)</SelectItem>
          <SelectItem value="global">Global (User Level)</SelectItem>
        </SelectContent>
      </Select>
      {selectedScope !== 'global' && (
        <McpProjectSelector onProjectChange={onProjectChange} disabled={disabled} />
      )}
    </div>
  );
}
