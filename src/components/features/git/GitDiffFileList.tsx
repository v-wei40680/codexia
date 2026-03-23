import type { GitStatusEntry } from '@/services/tauri';
import type { DiffSection, DiffSource } from './types';
import { GitDiffFileItem } from './GitDiffFileItem';

interface GitDiffFileListProps {
  cwd: string | null;
  entries: GitStatusEntry[];
  section: DiffSection;
  diffSource: DiffSource;
  wordWrapEnabled: boolean;
  selectedDiffPath: string | null;
  onSelect: (path: string) => void;
  onRefreshStatus: () => void;
}

export function GitDiffFileList({
  cwd,
  entries,
  section,
  diffSource,
  wordWrapEnabled,
  selectedDiffPath,
  onSelect,
  onRefreshStatus,
}: GitDiffFileListProps) {
  if (!cwd) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        No workspace open
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        No changed files
      </div>
    );
  }

  // Auto-expand all files if there are 10 or fewer; otherwise only the first 5
  const autoExpandThreshold = entries.length <= 10 ? entries.length : 5;

  return (
    <div className="flex-1 min-h-0 min-w-0 overflow-y-auto">
      {entries.map((entry, index) => (
        <GitDiffFileItem
          key={entry.path}
          cwd={cwd}
          entry={entry}
          section={section}
          diffSource={diffSource}
          wordWrapEnabled={wordWrapEnabled}
          defaultExpanded={index < autoExpandThreshold}
          isSelected={selectedDiffPath === entry.path}
          onSelect={() => onSelect(entry.path)}
          onRefreshStatus={onRefreshStatus}
        />
      ))}
    </div>
  );
}
