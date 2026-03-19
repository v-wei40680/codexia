import { FileTreeHeader } from './FileTreeHeader';
import { FileTreeNode } from './FileTreeNode';
import { useFileTree } from './useFileTree';
import type { FileTreeProps } from './types';

export function FileTree({ folder, isTreeVisible, onToggleTree, onFileSelect }: FileTreeProps) {
  const {
    treeContainerRef,
    root,
    displayRoot,
    activeExpanded,
    loadingNodes,
    loading,
    error,
    filterText,
    setFilterText,
    setRefreshKey,
    searching,
    searchError,
    isSearching,
    hasSearchResults,
    toggle,
    loadChildren,
  } = useFileTree(folder);

  const header = (
    <div className="shrink-0 border-b border-border/40 px-2 pb-1 pt-2">
      <FileTreeHeader
        currentFolder={folder}
        filterText={filterText}
        onFilterTextChange={setFilterText}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
        isTreeVisible={isTreeVisible}
        onToggleTree={onToggleTree}
      />
    </div>
  );

  if (!folder) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="px-2 pt-2 text-sm text-muted-foreground">No folder selected.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="px-2 pt-2 text-sm text-muted-foreground">Loading files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="px-2 pt-2 text-sm text-destructive">{error}</div>
      </div>
    );
  }

  const visibleNodes = displayRoot?.children ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {header}
      <div
        ref={treeContainerRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-2 py-1"
      >
        {!displayRoot ? (
          <div className="text-sm text-muted-foreground">No files found.</div>
        ) : (
          <>
            {isSearching && searching && (
              <div className="text-sm text-muted-foreground">Searching...</div>
            )}
            {isSearching && searchError && (
              <div className="text-sm text-destructive">{searchError}</div>
            )}
            {isSearching && !searching && !searchError && !hasSearchResults && (
              <div className="text-sm text-muted-foreground">No matching files or folders.</div>
            )}
            {(!isSearching || hasSearchResults) && (
              <div className="space-y-0.5">
                {visibleNodes.map((child) => (
                  <FileTreeNode
                    key={child.path}
                    node={child}
                    depth={0}
                    rootPath={root?.path}
                    activeExpanded={activeExpanded}
                    loadingNodes={loadingNodes}
                    onToggle={toggle}
                    onLoadChildren={loadChildren}
                    onFileSelect={onFileSelect}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
