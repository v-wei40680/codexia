import { useEffect, useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useLayoutStore } from '@/stores/settings';
import { NoteView } from '@/components/features/notes';
import { useWorkspaceStore } from '@/stores';
import { FileViewer } from '@/components/features/files';
import { GitDiffPanel } from '@/components/features/git';
import { FileTree } from '@/components/features/files/explorer';
import { WebPreview } from '../features/web-preview/WebPreview';
import { detectWebFramework } from '../features/web-preview/webFrameworkDetection';

export function RightPanel() {
  const { activeRightPanelTab, setActiveRightPanelTab, setRightPanelOpen } = useLayoutStore();
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
      <Tabs
        value={activeRightPanelTab}
        onValueChange={(value) => setActiveRightPanelTab(value as typeof activeRightPanelTab)}
        className="flex flex-col h-full min-h-0 gap-0"
      >
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
            <TabsContent
              value="diff"
              className="h-full min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden"
              forceMount
            >
              <GitDiffPanel cwd={cwd} isActive={activeRightPanelTab === 'diff'} />
            </TabsContent>

            <TabsContent
              value="note"
              className="h-full min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden"
            >
              <NoteView />
            </TabsContent>

            <TabsContent
              value="files"
              className="h-full min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden"
            >
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
            </TabsContent>
            <TabsContent
              value="webpreview"
              className="h-full min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden"
            >
              <WebPreview
                url={webPreviewUrl}
                onUrlChange={setWebPreviewUrl}
                onClose={() => setRightPanelOpen(false)}
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
