import { useEffect, useState } from 'react';
import { useLayoutStore } from '@/stores/settings';
import { NoteView } from '@/components/features/notes';
import { useWorkspaceStore } from '@/stores';
import { FileViewer } from '@/components/features/files';
import { GitDiffPanel } from '@/components/features/git';
import { FileTree } from '@/components/features/files/explorer';
import { WebPreview } from '../features/web-preview/WebPreview';
import { detectWebFramework } from '../features/web-preview/webFrameworkDetection';

export function RightPanel() {
  const { activeRightPanelTab, setRightPanelOpen } = useLayoutStore();
  const { selectedFilePath, cwd } = useWorkspaceStore();
  const [webPreviewUrl, setWebPreviewUrl] = useState('');

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
              <div className="h-full w-64 min-w-64 border-r border-border bg-sidebar/20">
                <FileTree folder={cwd} />
              </div>
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                {selectedFilePath ? (
                  <FileViewer filePath={selectedFilePath} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Select a file to view
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
