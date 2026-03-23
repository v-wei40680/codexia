import { Suspense, lazy, useEffect, useRef } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { useLayoutStore } from '@/stores';
import { SideBar } from '@/components/layout/SideBar';
import { RightPanel } from '@/components/layout/RightPanel';
import { AgentHeader } from '@/components/layout';
import { History } from '@/components/codex/history';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { BottomTerminal } from '../terminal/BottomTerminal';
import { useTrafficLightConfig } from '@/hooks';

const SettingsView = lazy(() =>
  import('@/components/settings').then((module) => ({ default: module.SettingsView })),
);
const UsageView = lazy(() => import('@/views/UsageView'));
const MarketplaceView = lazy(() =>
  import('@/views/MarketplaceView').then((module) => ({ default: module.MarketplaceView })),
);
const AgentsView = lazy(() => import('@/views/AgentsView'));
const AgentView = lazy(() => import('@/views/AgentView'));
const LoginView = lazy(() => import('@/views/LoginView'));
const AutoMationsView = lazy(() =>
  import('../features/automations').then((module) => ({ default: module.AutoMationsView })),
);

const ViewLoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
    Loading view...
  </div>
);

export function AppLayout() {
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
    isTerminalOpen,
    setIsTerminalOpen,
  } = useLayoutStore();
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const isMobile = useIsMobile();
  const hasInitializedMobileLayoutRef = useRef(false);
  const { needsTrafficLightOffset } = useTrafficLightConfig(isSidebarOpen);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === ',') {
          event.preventDefault();
          setView('settings');
        } else if (event.key === 'b') {
          event.preventDefault();
          setSidebarOpen(!isSidebarOpen);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen, setSidebarOpen, setView]);

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

  const handleRightPanelResize = (size: number) => {
    if (!isRightPanelOpen || size <= 0) {
      return;
    }
    const nextSize = clamp(size, MIN_RIGHT_PANEL_SIZE, MAX_RIGHT_PANEL_SIZE);
    if (nextSize !== rightPanelSize) {
      setRightPanelSize(nextSize);
    }
  };

  const showAgentHeader = view === 'agent' || view === 'history'

  const activeView = (
    <Suspense fallback={<ViewLoadingFallback />}>
      {view === 'agents' && <AgentsView />}
      {view === 'agent' && <AgentView />}
      {view === 'automations' && <AutoMationsView />}
      {view === 'history' && <History />}
      {view === 'login' && <LoginView />}
      {view === 'marketplace' && <MarketplaceView />}
      {view === 'usage' && <UsageView />}
    </Suspense>
  );

  const mainContent = (
    <div className="flex flex-col min-w-0 h-full">
      <div className="min-h-0 flex-1">{activeView}</div>
      {(view === 'agent') && (
        <BottomTerminal open={isTerminalOpen} onOpenChange={setIsTerminalOpen} />
      )}
    </div>
  );

  return (
    <div className="h-[100dvh] w-full overflow-hidden">
      {view === 'settings' ? (
        <Suspense fallback={<ViewLoadingFallback />}>
          <SettingsView />
        </Suspense>
      ) : isMobile ? (
        // Mobile layout: sidebar as overlay
        <div className="relative h-full w-full bg-background">
          <div className="flex h-full w-full flex-col min-h-0 min-w-0">
            {showAgentHeader ? (
              <AgentHeader />
            ) : (
              !isSidebarOpen && (
                <div className={`absolute z-20 flex h-11 items-center ${needsTrafficLightOffset ? 'left-20 top-0' : 'left-0 top-0 pl-2'}`}>
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
              <div className="absolute inset-y-0 left-0 z-40 w-72">
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
        // Desktop layout: fixed-width sidebar
        <div className="flex h-full w-full">
          {isSidebarOpen && (
            <div className="h-full w-64 shrink-0">
              <SideBar />
            </div>
          )}
          <main className="bg-background relative flex flex-1 flex-col min-w-0 h-full">
            {showAgentHeader ? (
              <AgentHeader />
            ) : (
              !isSidebarOpen && (
                <div className={`absolute z-20 flex h-11 items-center ${needsTrafficLightOffset ? 'left-20 top-0' : 'left-0 top-0 pl-2'}`}>
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                    <PanelLeft />
                  </Button>
                </div>
              )
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
        </div>
      )}
    </div>
  );
}
