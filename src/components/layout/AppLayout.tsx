import { Suspense, lazy, useEffect, useRef } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { useLayoutStore } from '@/stores';
import { SideBar } from '@/components/layout/SideBar';
import { RightPanel } from '@/components/layout/RightPanel';
import { AgentHeader } from '@/components/layout';
import { History } from '@/components/codex/history';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { BottomTerminal } from '../terminal/BottomTerminal';
import { useTrafficLightConfig } from '@/hooks';
import { useEdgeSwipe } from '@/hooks/useEdgeSwipe';

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
const InsightsView = lazy(() => import('@/components/features/insight/InsightsView'));

type MobileContentProps = {
  showAgentHeader: boolean;
  triggerButton: React.ReactNode;
  mainContent: React.ReactNode;
  isRightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
};

function MobileContent({
  showAgentHeader,
  triggerButton,
  mainContent,
  isRightPanelOpen,
  setRightPanelOpen,
}: MobileContentProps) {
  const { setOpenMobile } = useSidebar();
  useEdgeSwipe({ onSwipeRight: () => setOpenMobile(true) });

  return (
    <div className="relative flex flex-1 flex-col h-full w-full min-w-0 bg-background">
      {showAgentHeader ? <AgentHeader /> : triggerButton}
      <main className="bg-background relative flex min-h-0 min-w-0 flex-1 flex-col">
        {mainContent}
      </main>

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
  );
}

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
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        setView('settings');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setView]);

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

  const showAgentHeader = view === 'agent' || view === 'history';

  const activeView = (
    <Suspense fallback={<ViewLoadingFallback />}>
      {view === 'agents' && <AgentsView />}
      {view === 'agent' && <AgentView />}
      {view === 'automations' && <AutoMationsView />}
      {view === 'history' && <History />}
      {view === 'login' && <LoginView />}
      {view === 'marketplace' && <MarketplaceView />}
      {view === 'usage' && <UsageView />}
      {view === 'insights' && <InsightsView />}
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

  const triggerButton = (
    <div className={`absolute z-20 flex h-11 items-center ${needsTrafficLightOffset ? 'left-20 top-0' : 'left-0 top-0 pl-2'}`}>
      <SidebarTrigger />
    </div>
  );

  return (
    <div className="h-[100dvh] w-full overflow-hidden">
      {view === 'settings' ? (
        <Suspense fallback={<ViewLoadingFallback />}>
          <SettingsView />
        </Suspense>
      ) : (
        <SidebarProvider
          open={isSidebarOpen}
          onOpenChange={setSidebarOpen}
          className="h-full min-h-0"
        >
          <SideBar />
          {isMobile ? (
            // Mobile layout: sidebar renders as Sheet overlay (handled by shadcn Sidebar)
            // Edge swipe to open is handled inside MobileContent via useSidebar context
            <MobileContent
              showAgentHeader={showAgentHeader}
              triggerButton={triggerButton}
              mainContent={mainContent}
              isRightPanelOpen={isRightPanelOpen}
              setRightPanelOpen={setRightPanelOpen}
            />
          ) : (
            // Desktop layout: sidebar gap handled by shadcn Sidebar component
            <SidebarInset className="min-w-0 overflow-hidden h-full">
              {showAgentHeader ? (
                <AgentHeader />
              ) : (
                !isSidebarOpen && triggerButton
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
            </SidebarInset>
          )}
        </SidebarProvider>
      )}
    </div>
  );
}
