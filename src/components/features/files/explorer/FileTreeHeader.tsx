import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder, PanelLeftClose, RefreshCw, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface FileTreeHeaderProps {
  currentFolder?: string;
  filterText: string;
  onFilterTextChange: (text: string) => void;
  onRefresh: () => void;
  isTreeVisible?: boolean;
  onToggleTree?: () => void;
}

export function FileTreeHeader({
  currentFolder,
  filterText,
  onFilterTextChange,
  onRefresh,
  isTreeVisible,
  onToggleTree,
}: FileTreeHeaderProps) {
  // Treat the search bar as open when there is already a filter value
  const [showSearchInput, setShowSearchInput] = useState(() => filterText.length > 0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Keep search bar open whenever the parent has a non-empty filter
  useEffect(() => {
    if (filterText.length > 0) {
      setShowSearchInput(true);
    }
  }, [filterText]);

  useEffect(() => {
    if (showSearchInput) {
      searchInputRef.current?.focus();
    }
  }, [showSearchInput]);

  const getCurrentDirectoryName = () => {
    if (!currentFolder) return 'Home';
    // Support both Unix (/) and Windows (\) path separators
    const parts = currentFolder.split(/[/\\]+/);
    return parts.pop() || currentFolder;
  };

  const handleToggleSearch = () => {
    if (showSearchInput) {
      // Close: also clear any active filter so the tree returns to normal
      onFilterTextChange('');
      setShowSearchInput(false);
    } else {
      setShowSearchInput(true);
    }
  };

  return (
    <div className="space-y-1 pb-1">
      <div className="flex items-center justify-between gap-1">
        {/* Left: collapse-tree button + folder name */}
        <div className="flex items-center gap-1 min-w-0">
          {onToggleTree ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onToggleTree}
              title={isTreeVisible ? 'Hide file tree' : 'Show file tree'}
              aria-label={isTreeVisible ? 'Hide file tree' : 'Show file tree'}
            >
              {/* Always show the close icon here — tree is visible when this header is rendered */}
              <PanelLeftClose className="w-3.5 h-3.5" />
            </Button>
          ) : null}
          <Folder className="w-4 h-4 text-primary shrink-0" />
          <span
            className="text-sm font-medium text-foreground truncate"
            title={currentFolder || 'Home'}
          >
            {getCurrentDirectoryName()}
          </span>
        </div>

        {/* Right: refresh + search toggle */}
        <span className="flex shrink-0 gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRefresh}
            title="Refresh directory"
            aria-label="Refresh directory"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleToggleSearch}
            title={showSearchInput ? 'Close search' : 'Search files or folders'}
            aria-label={showSearchInput ? 'Close search' : 'Search files or folders'}
            aria-pressed={showSearchInput}
          >
            {showSearchInput ? <X className="w-3 h-3" /> : <Search className="w-3 h-3" />}
          </Button>
        </span>
      </div>

      {showSearchInput && (
        <Input
          ref={searchInputRef}
          placeholder="Search files or folders…"
          value={filterText}
          onChange={(e) => onFilterTextChange(e.target.value)}
          className="h-7 text-sm"
          // ESC key closes the search bar and clears the filter
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleToggleSearch();
            }
          }}
        />
      )}
    </div>
  );
}
