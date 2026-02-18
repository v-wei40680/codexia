import { useEffect, useState } from 'react';
import { useLayoutStore } from '@/stores/settings';
import { NoteView } from '@/components/features/notes';
import { useWorkspaceStore } from '@/stores';
import { FileViewer } from '@/components/features/files';
import { GitDiffPanel } from '@/components/features/git';
import { FileTree } from '@/components/features/files/explorer';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen } from 'lucide-react';
import { WebPreview } from '../features/web-preview/WebPreview';
import { detectWebFramework } from '../features/web-preview/webFrameworkDetection';

export function RightPanel() {
  const { activeRightPanelTab, setRightPanelOpen } = useLayoutStore();
  const { selectedFilePath, cwd } = useWorkspaceStore();
  const [webPreviewUrl, setWebPreviewUrl] = useState('');
  const [isFileTreeVisible, setIsFileTreeVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadWebPreviewUrl = async () => {
      if (!cwd) {
        if (!cancelled) setWebPreviewUrl('');
        return;
      }

      const framework = await detectWebFramework(cwd);
      if (!cancelled) {
        setWebPreviewUrl(framework?.devUrl ?? '');
      }
    };

    void loadWebPreviewUrl();

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  // Reset tree visibility whenever the workspace changes
  useEffect(() => {
    setIsFileTreeVisible(true);
  }, [cwd]);

  return (
    <div className="h-full w-full min-h-0 border-l border-white/10 bg-sidebar/30 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <div className={activeRightPanelTab === 'diff' ? 'h-full min-h-0 overflow-hidden' : 'hidden'}>
            <GitDiffPanel cwd={cwd} isActive={activeRightPanelTab === 'diff'} />
          </div>

          {activeRightPanelTab === 'note' && (
            <div className="h-full min-h-0 overflow-hidden">
              <NoteView />
            </div>
          )}

          {activeRightPanelTab === 'files' && (
            <div className="flex h-full min-h-0 overflow-hidden">
              {/* File tree sidebar — slides out without leaving a gap */}
              {isFileTreeVisible && (
                <div className="h-full w-64 min-w-64 shrink-0 border-r border-border bg-sidebar/20 overflow-hidden pl-2 pt-2">
                  <FileTree
                    folder={cwd}
                    isTreeVisible={isFileTreeVisible}
                    onToggleTree={() => setIsFileTreeVisible(false)}
                  />
                </div>
              )}

              {/* File viewer — fills all remaining space */}
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                {selectedFilePath ? (
                  <FileViewer
                    filePath={selectedFilePath}
                    // When the tree is hidden, render the expand button inside the viewer header
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
                ) : (
                  /* No file selected: still expose the expand button when tree is hidden */
                  <div className="flex h-full flex-col">
                    {!isFileTreeVisible && (
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
                    )}
                    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                      Select a file to view
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeRightPanelTab === 'webpreview' && (
            <div className="h-full min-h-0 overflow-hidden">
              <WebPreview
                url={webPreviewUrl}
                onUrlChange={setWebPreviewUrl}
                onClose={() => setRightPanelOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
