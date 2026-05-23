import { useState, useEffect, Suspense } from 'react';
import { useWorkspaceStore } from '@/stores';
import { FileTree, FileViewer } from './explorer';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function FilesPanel() {
  const { selectedFilePath, setSelectedFilePath, cwd } = useWorkspaceStore();
  const isMobile = useIsMobile();
  const [isFileTreeVisible, setIsFileTreeVisible] = useState(true);

  // Reset tree visibility whenever the workspace changes
  useEffect(() => {
    setIsFileTreeVisible(!isMobile);
  }, [cwd, isMobile]);

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden w-full">
      {/* File tree sidebar — expands to full width when no file is open */}
      {isFileTreeVisible && !isMobile && (
        <div
          className={`h-full shrink-0 border-r border-border bg-sidebar/20 overflow-hidden ${
            selectedFilePath ? 'w-64 min-w-64' : 'flex-1'
          }`}
        >
          <FileTree
            folder={cwd}
            isTreeVisible={isFileTreeVisible}
            onToggleTree={() => setIsFileTreeVisible(false)}
          />
        </div>
      )}

      {isFileTreeVisible && isMobile && (
        <>
          <button
            type="button"
            className="absolute inset-0 z-10 bg-black/20"
            aria-label="Hide file tree"
            onClick={() => setIsFileTreeVisible(false)}
          />
          <div className="absolute inset-y-0 left-0 z-20 w-[min(78vw,280px)] border-r border-border bg-sidebar/90 overflow-hidden backdrop-blur">
            <FileTree
              folder={cwd}
              isTreeVisible={isFileTreeVisible}
              onToggleTree={() => setIsFileTreeVisible(false)}
            />
          </div>
        </>
      )}

      {/* File viewer — only rendered when a file is selected */}
      {selectedFilePath ? (
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <Suspense fallback={null}>
            <FileViewer
              filePath={selectedFilePath}
              onClose={() => {
                setSelectedFilePath(null);
                if (!isFileTreeVisible) setIsFileTreeVisible(true);
              }}
              headerLeadingAction={
                !isFileTreeVisible ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => setIsFileTreeVisible(true)}
                    title="Show file tree"
                    aria-label="Show file tree"
                  >
                    <PanelLeftOpen className="h-3.5 w-3.5" />
                  </Button>
                ) : undefined
              }
            />
          </Suspense>
        </div>
      ) : !isFileTreeVisible ? (
        /* Tree hidden and no file open — show expand button */
        <div className="flex h-full flex-1 flex-col">
          <div className="flex items-center border-b border-border px-2 py-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsFileTreeVisible(true)}
              title="Show file tree"
              aria-label="Show file tree"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a file to view
          </div>
        </div>
      ) : null}
    </div>
  );
}
