import { useEffect, useRef, useState } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { useLayoutStore } from '@/stores';
import { SettingsView } from '@/components/settings';
import { SideBar } from '@/components/layout/SideBar';
import { RightPanel } from '@/components/layout/RightPanel';
import { MainHeader } from '@/components/layout/MainHeader';
import { ChatInterface } from '@/components/codex/ChatInterface';
import { History } from '@/components/codex/history';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import UsageView from '@/views/UsageView';
import CCView from '@/views/CCView';
import { MarketplaceView } from '@/views/MarketplaceView';
import AgentsView from '@/views/AgentsView';
import LoginView from '@/views/LoginView';
import { AutoMateView } from '../features/AutoMateView';

export function AppLayout() {
  const MIN_SIDEBAR_WIDTH = 220;
  const MAX_SIDEBAR_WIDTH = 480;
  const { isSidebarOpen, setSidebarOpen, isRightPanelOpen, setRightPanelOpen, view, setView } =
    useLayoutStore();
  const { historyMode } = useWorkspaceStore();
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const [sidebarPercent, setSidebarPercent] = useState(22);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [layoutWidth, setLayoutWidth] = useState(0);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  const getMinSidebarPercent = (width: number) =>
    width > 0 ? Math.min(100, (MIN_SIDEBAR_WIDTH / width) * 100) : 15;
  const getMaxSidebarPercent = (width: number) => {
    if (width <= 0) {
      return 35;
    }
    const minPercent = getMinSidebarPercent(width);
    const maxPercent = Math.min(100, (MAX_SIDEBAR_WIDTH / width) * 100);
    return Math.max(minPercent, maxPercent);
  };
  const minSidebarPercent = getMinSidebarPercent(layoutWidth);
  const maxSidebarPercent = getMaxSidebarPercent(layoutWidth);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ',' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setView('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setView]);

  useEffect(() => {
    if (view === 'settings') {
      return;
    }
    if (historyMode && view === 'codex') {
      setView('history');
      return;
    }
    if (!historyMode && view === 'history') {
      setView('codex');
    }
  }, [historyMode, setView, view]);

  useEffect(() => {
    const panel = rightPanelRef.current;
    if (!panel) {
      return;
    }

    if (isRightPanelOpen) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [isRightPanelOpen]);

  useEffect(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) {
      return;
    }
    if (isSidebarOpen) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    const node = layoutRef.current;
    if (!node) {
      return;
    }
    const updateWidth = () => {
      const width = node.getBoundingClientRect().width;
      setLayoutWidth(width);
      const minPercent = getMinSidebarPercent(width);
      const maxPercent = getMaxSidebarPercent(width);
      const nextPercent = clamp((sidebarWidth / width) * 100, minPercent, maxPercent);
      setSidebarPercent(nextPercent);
      if (isSidebarOpen) {
        sidebarPanelRef.current?.resize(nextPercent);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [isSidebarOpen, sidebarWidth]);

  const handleSidebarResize = (size: number) => {
    const node = layoutRef.current;
    if (!node) {
      return;
    }
    const width = node.getBoundingClientRect().width;
    const minPercent = getMinSidebarPercent(width);
    const maxPercent = getMaxSidebarPercent(width);
    const nextPercent = clamp(size, minPercent, maxPercent);
    setSidebarPercent(nextPercent);
    setSidebarWidth(Math.round((width * nextPercent) / 100));
  };

  return (
    <div ref={layoutRef} className="h-screen w-screen overflow-x-hidden">
      {view === 'settings' ? (
        <SettingsView />
      ) : (
        <div
          className="h-full w-full"
          style={
            {
              '--sidebar-width': `${sidebarWidth}px`,
            } as React.CSSProperties
          }
        >
          <ResizablePanelGroup
            direction="horizontal"
            className="flex h-full min-h-0 min-w-0 w-full flex-1"
          >
            <ResizablePanel
              ref={sidebarPanelRef}
              defaultSize={sidebarPercent}
              minSize={minSidebarPercent}
              maxSize={maxSidebarPercent}
              onResize={handleSidebarResize}
              collapsible
              collapsedSize={0}
              onCollapse={() => setSidebarOpen(false)}
              onExpand={() => setSidebarOpen(true)}
            >
              <SideBar />
            </ResizablePanel>
            <ResizableHandle className="w-2 -ml-1 bg-transparent hover:bg-border/60 cursor-col-resize" />
            <ResizablePanel defaultSize={100 - sidebarPercent} minSize={50}>
              <main className="bg-background relative flex w-full flex-1 flex-col min-w-0 h-full">
                <ResizablePanelGroup
                  direction="horizontal"
                  className="flex h-full min-h-0 min-w-0 w-full flex-1"
                >
                  <ResizablePanel defaultSize={isRightPanelOpen ? 32 : 100} minSize={25}>
                    <div className="flex flex-col min-w-0 h-full">
                      <MainHeader />
                      {view === 'agents' && <AgentsView />}
                      {view === 'automate' && <AutoMateView />}
                      {view === 'codex' && <ChatInterface />}
                      {view === 'history' && <History />}
                      {view === 'login' && <LoginView />}
                      {view === 'marketplace' && <MarketplaceView />}
                      {view === 'usage' && <UsageView />}
                      {view === 'cc' && <CCView />}
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel
                    ref={rightPanelRef}
                    defaultSize={isRightPanelOpen ? 68 : 0}
                    minSize={22}
                    maxSize={75}
                    collapsible
                    collapsedSize={0}
                    onCollapse={() => setRightPanelOpen(false)}
                    onExpand={() => setRightPanelOpen(true)}
                  >
                    <RightPanel />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </main>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}
    </div>
  );
}
