import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { useLayoutStore } from '@/stores';
import { SideBar } from '@/components/layout/SideBar';
import { RightPanel } from '@/components/layout/RightPanel';
import { MainHeader } from '@/components/layout/MainHeader';
import { ChatInterface } from '@/components/codex/ChatInterface';
import { History } from '@/components/codex/history';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { BottomTerminal } from '@/components/terminal/BottomTerminal';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const SettingsView = lazy(() =>
  import('@/components/settings').then((module) => ({ default: module.SettingsView })),
);
const UsageView = lazy(() => import('@/views/UsageView'));
const CCView = lazy(() => import('@/components/cc/CCView'));
const MarketplaceView = lazy(() =>
  import('@/views/MarketplaceView').then((module) => ({ default: module.MarketplaceView })),
);
const AgentsView = lazy(() => import('@/views/AgentsView'));
const LoginView = lazy(() => import('@/views/LoginView'));
const AutoMationsView = lazy(() =>
  import('../features/automations').then((module) => ({ default: module.AutoMationsView })),
);
const LearnView = lazy(() =>
  import('@/views/LearnView').then((module) => ({ default: module.LearnView })),
);

const ViewLoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
    Loading view...
  </div>
);

export function AppLayout() {
  const MIN_SIDEBAR_WIDTH = 220;
  const MAX_SIDEBAR_WIDTH = 480;
  const MIN_RIGHT_PANEL_SIZE = 22;
  const MAX_RIGHT_PANEL_SIZE = 75;
  const {
    isSidebarOpen,
    setSidebarOpen,
    isRightPanelOpen,
    setRightPanelOpen,
    rightPanelSize,
    setRightPanelSize,
    view,
    setView,
  } = useLayoutStore();
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const [sidebarPercent, setSidebarPercent] = useState(22);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const isMobile = useIsMobile();
  const hasInitializedMobileLayoutRef = useRef(false);

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
    if (view !== 'codex' && view !== 'cc') {
      setIsTerminalOpen(false);
    }
  }, [view]);

  useEffect(() => {
    if (isMobile) {
      return;
    }

    const panel = rightPanelRef.current;
    if (!panel) {
      return;
    }

    if (isRightPanelOpen) {
      const nextRightPanelSize = clamp(rightPanelSize, MIN_RIGHT_PANEL_SIZE, MAX_RIGHT_PANEL_SIZE);
      panel.resize(nextRightPanelSize);
      panel.expand();
      if (nextRightPanelSize !== rightPanelSize) {
        setRightPanelSize(nextRightPanelSize);
      }
    } else {
      panel.collapse();
    }
  }, [isMobile, isRightPanelOpen, rightPanelSize, setRightPanelSize]);

  useEffect(() => {
    if (isMobile) {
      return;
    }

    const panel = sidebarPanelRef.current;
    if (!panel) {
      return;
    }
    if (isSidebarOpen) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [isMobile, isSidebarOpen]);

  useEffect(() => {
    if (isMobile) {
      return;
    }

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
  }, [isMobile, isSidebarOpen, sidebarWidth]);

  useEffect(() => {
    if (!isMobile) {
      hasInitializedMobileLayoutRef.current = false;
      return;
    }

    if (hasInitializedMobileLayoutRef.current) {
      return;
    }

    hasInitializedMobileLayoutRef.current = true;
    if (isSidebarOpen) {
      setSidebarOpen(false);
    }
    if (isRightPanelOpen) {
      setRightPanelOpen(false);
    }
  }, [isMobile, isRightPanelOpen, isSidebarOpen, setRightPanelOpen, setSidebarOpen]);

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

  const handleRightPanelResize = (size: number) => {
    if (!isRightPanelOpen || size <= 0) {
      return;
    }
    const nextSize = clamp(size, MIN_RIGHT_PANEL_SIZE, MAX_RIGHT_PANEL_SIZE);
    if (nextSize !== rightPanelSize) {
      setRightPanelSize(nextSize);
    }
  };
  const showMainHeader = view === 'codex' || view === 'cc' || view === 'history' || view === 'marketplace';

  const activeView = (
    <Suspense fallback={<ViewLoadingFallback />}>
      {view === 'agents' && <AgentsView />}
      {view === 'automations' && <AutoMationsView />}
      {view === 'codex' && <ChatInterface />}
      {view === 'history' && <History />}
      {view === 'learn' && <LearnView />}
      {view === 'login' && <LoginView />}
      {view === 'marketplace' && <MarketplaceView />}
      {view === 'usage' && <UsageView />}
      {view === 'cc' && <CCView />}
    </Suspense>
  );

  const mainContent = (
    <div className="flex flex-col min-w-0 h-full">
      <div className="min-h-0 flex-1">{activeView}</div>
      {(view === 'codex' || view === 'cc') && (
        <BottomTerminal open={isTerminalOpen} onOpenChange={setIsTerminalOpen} />
      )}
    </div>
  );

  return (
    <div ref={layoutRef} className="h-[100dvh] w-full overflow-hidden">
      {view === 'settings' ? (
        <Suspense fallback={<ViewLoadingFallback />}>
          <SettingsView />
        </Suspense>
      ) : isMobile ? (
        <div className="relative h-full w-full bg-background">
          <div className="flex h-full w-full flex-col min-h-0 min-w-0">
            {showMainHeader ? (
              <MainHeader
                isTerminalOpen={isTerminalOpen}
                onToggleTerminal={() => setIsTerminalOpen((prev) => !prev)}
              />
            ) : (
              !isSidebarOpen && (
                <div className="absolute left-0 top-0 z-20 flex h-11 items-center pl-2">
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                    <PanelLeft />
                  </Button>
                </div>
              )
            )}
            <main className="bg-background relative flex min-h-0 min-w-0 flex-1 flex-col">
              {mainContent}
            </main>
          </div>

          {isSidebarOpen && (
            <>
              <button
                type="button"
                className="absolute inset-0 z-30 bg-black/50"
                aria-label="Close sidebar"
                onClick={() => setSidebarOpen(false)}
              />
              <div
                className="absolute inset-y-0 left-0 z-40"
                style={
                  {
                    '--sidebar-width': 'min(85vw, 320px)',
                  } as React.CSSProperties
                }
              >
                <SideBar />
              </div>
            </>
          )}

          {isRightPanelOpen && (
            <>
              <button
                type="button"
                className="absolute inset-0 z-30 bg-black/40"
                aria-label="Close right panel"
                onClick={() => setRightPanelOpen(false)}
              />
              <div className="absolute inset-y-0 right-0 z-40 w-[min(92vw,420px)]">
                <RightPanel />
              </div>
            </>
          )}
        </div>
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
                {showMainHeader ? (
                  <MainHeader
                    isTerminalOpen={isTerminalOpen}
                    onToggleTerminal={() => setIsTerminalOpen((prev) => !prev)}
                  />
                ) : (
                  <>
                    {!isSidebarOpen && (
                      <div className="absolute left-0 top-0 z-20 flex h-11 items-center pl-20">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                          <PanelLeft />
                        </Button>
                      </div>
                    )}
                  </>
                )}
                <ResizablePanelGroup
                  direction="horizontal"
                  className="flex min-h-0 min-w-0 w-full flex-1"
                >
                  <ResizablePanel defaultSize={isRightPanelOpen ? 32 : 100} minSize={25}>
                    {mainContent}
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel
                    ref={rightPanelRef}
                    defaultSize={isRightPanelOpen ? rightPanelSize : 0}
                    minSize={MIN_RIGHT_PANEL_SIZE}
                    maxSize={MAX_RIGHT_PANEL_SIZE}
                    onResize={handleRightPanelResize}
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
