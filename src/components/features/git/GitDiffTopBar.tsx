import { Folder, FolderOpen, Menu, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DiffSection, DiffSource } from './types';

interface GitDiffTopBarProps {
  cwd: string | null;
  gitLoading: boolean;
  diffSource: DiffSource;
  onDiffSourceChange: (value: DiffSource) => void;
  selectedDiffSection: DiffSection;
  onDiffSectionChange: (value: DiffSection) => void;
  unstagedCount: number;
  stagedCount: number;
  showFileTree: boolean;
  onToggleFileTree: () => void;
  wordWrapEnabled: boolean;
  onToggleWordWrap: () => void;
  onRefresh: () => void;
}

export function GitDiffTopBar({
  cwd,
  gitLoading,
  diffSource,
  onDiffSourceChange,
  selectedDiffSection,
  onDiffSectionChange,
  unstagedCount,
  stagedCount,
  showFileTree,
  onToggleFileTree,
  wordWrapEnabled,
  onToggleWordWrap,
  onRefresh,
}: GitDiffTopBarProps) {
  return (
    <div className="border-b border-white/10 flex items-center gap-2">
      <div className="w-48 shrink-0">
        <Select value={diffSource} onValueChange={(value) => onDiffSourceChange(value as DiffSource)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uncommitted">uncommitted changes</SelectItem>
            <SelectItem value="latest-turn">latest turn changes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1" />

      <div className="flex items-center">
        <div className="flex items-center gap-1 rounded-md border border-white/10 bg-background/60 p-1">
          <Button
            size="sm"
            variant={selectedDiffSection === 'unstaged' ? 'default' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => onDiffSectionChange('unstaged')}
          >
            Unstaged ({unstagedCount})
          </Button>
          <Button
            size="sm"
            variant={selectedDiffSection === 'staged' ? 'default' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => onDiffSectionChange('staged')}
          >
            Staged ({stagedCount})
          </Button>
        </div>
        <Button
          variant={showFileTree ? 'secondary' : 'ghost'}
          size="icon-sm"
          onClick={onToggleFileTree}
          aria-label={showFileTree ? 'Hide file tree' : 'Show file tree'}
          title={showFileTree ? 'Hide file tree' : 'Show file tree'}
        >
          {showFileTree ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Panel menu" title="Panel menu">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRefresh} disabled={!cwd || gitLoading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleWordWrap}>
              {wordWrapEnabled ? 'Disable word wrap' : 'Enable word wrap'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
