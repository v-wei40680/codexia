import { useEffect, useState } from 'react';
import { Chrome, Files, GitBranch, StickyNote } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLayoutStore } from '@/stores/settings';
import { NoteView } from '@/components/features/notes';
import { useWorkspaceStore } from '@/stores';
import { FileViewer } from '@/components/features/files';
import { GitDiffPanel } from '@/components/features/GitDiffPanel';
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
        <div
          className="flex items-center justify-between h-11 px-3 border-b border-white/10"
          data-tauri-drag-region
        >
          <TabsList className="h-9 bg-transparent">
            <TabsTrigger value="diff" className="h-8 w-9 px-0" title="Diff">
              <GitBranch className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="note" className="h-8 w-9 px-0" title="Notes">
              <StickyNote className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="files" className="h-8 w-9 px-0" title="Files">
              <Files className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="webpreview" className="h-8 w-9 px-0" title="Web Preview">
              <Chrome className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </div>

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
              {selectedFilePath ? (
                <FileViewer filePath={selectedFilePath} />
              ) : (
                'Select a file to view'
              )}
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
