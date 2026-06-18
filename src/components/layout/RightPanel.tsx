import { lazy, Suspense, useEffect, useState } from 'react';
import { useLayoutStore, useWorkspaceStore } from '@/stores';
import { detectWebFramework } from '../features/web-preview/webFrameworkDetection';
import { useIsMobile } from '@/hooks/use-mobile';
import { RightPanelHeader } from './RightPanelHeader';

const NoteView = lazy(() =>
  import('@/components/features/notes').then((m) => ({ default: m.NoteView })),
);
const FilesPanel = lazy(() =>
  import('@/components/features/files').then((m) => ({ default: m.FilesPanel })),
);
const GitDiffPanel = lazy(() =>
  import('@/components/features/git').then((m) => ({ default: m.GitDiffPanel })),
);
const WebPreview = lazy(() =>
  import('../features/web-preview/WebPreview').then((m) => ({ default: m.WebPreview })),
);
const TasksPanel = lazy(() =>
  import('@/components/agent/TasksPanel').then((m) => ({ default: m.TasksPanel })),
);

export function RightPanel() {
  const { activeRightPanelTab, setRightPanelOpen } = useLayoutStore();
  const { cwd } = useWorkspaceStore();
  const isMobile = useIsMobile();
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
    <div className={`h-full w-full min-h-0 border-l border-white/10 flex flex-col overflow-hidden ${isMobile ? 'bg-sidebar' : 'bg-sidebar/30'}`}>
      {isMobile && (
        <div className="flex items-center justify-between h-11 border-b border-white/10 px-1 shrink-0">
          <RightPanelHeader />
        </div>
      )}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <Suspense fallback={null}>
            <div className={activeRightPanelTab === 'diff' ? 'h-full min-h-0 overflow-hidden' : 'hidden'}>
              <GitDiffPanel cwd={cwd} isActive={activeRightPanelTab === 'diff'} />
            </div>
          </Suspense>

          {activeRightPanelTab === 'tasks' && (
            <div className="h-full min-h-0 overflow-hidden">
              <Suspense fallback={null}>
                <TasksPanel />
              </Suspense>
            </div>
          )}

          {activeRightPanelTab === 'note' && (
            <div className="h-full min-h-0 overflow-hidden">
              <Suspense fallback={null}>
                <NoteView />
              </Suspense>
            </div>
          )}

          {activeRightPanelTab === 'files' && (
            <Suspense fallback={null}>
              <FilesPanel />
            </Suspense>
          )}

          {activeRightPanelTab === 'webpreview' && (
            <div className="h-full min-h-0 overflow-hidden">
              <Suspense fallback={null}>
                <WebPreview
                  url={webPreviewUrl}
                  onUrlChange={setWebPreviewUrl}
                  onClose={() => setRightPanelOpen(false)}
                />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
