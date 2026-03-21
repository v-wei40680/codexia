import { useEffect, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import { useCodexEvents } from '@/hooks/codex';
import { useDeepLink } from '@/hooks/useDeepLink';
import { AppLayout } from '@/components/layout';
import { isTauri, getIsPhone } from '@/hooks/runtime';
import { HistoryProjectsDialog } from '@/components/project-selector';
import { AnalyticsConsentDialog } from '@/components/settings/AnalyticsConsentDialog';
import { initializeCodexAsync } from '@/services/tauri';
import type { InitializeResponse } from './bindings';
import { useAgentCenterStore, useLayoutStore } from '@/stores';
import { StoreErrorBoundary } from '@/components/StoreErrorBoundary';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTrayPendingStore } from '@/stores/useTrayPendingStore';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { codexService } from '@/services/codexService';
import { useAgentLimit } from '@/hooks/useAgentLimit';
import { useP2PConnection } from '@/hooks/useP2PConnection';
import { DesktopOfflineScreen } from '@/components/features/DesktopOfflineScreen';
import { useTunnel } from '@/hooks/useTunnel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function AppShell() {
  const [quitDialogOpen, setQuitDialogOpen] = useState(false);
  const [isPhone, setIsPhone] = useState<boolean | null>(null);
  useEffect(() => { void getIsPhone().then(setIsPhone); }, []);
  const { pending, clearPending } = useTrayPendingStore();
  const { handleNewSession } = useCCSessionManager();
  const { addAgentCard, setCurrentAgentCardId, setMaxCards } = useAgentCenterStore();
  const { maxCards } = useAgentLimit();

  // Mobile: auto-connect to desktop via Quinn P2P
  const { state: p2pState, error: p2pError, retry: p2pRetry } = useP2PConnection();

  // Desktop: auto-start P2P server on login so mobile can connect
  const { start: p2pStart, status: p2pStatus } = useTunnel();
  useEffect(() => {
    if (!isTauri() || isPhone !== false || p2pStatus.connected) return;
    void p2pStart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPhone]);

  // Sync the subscription-derived limit into the store so all addAgentCard callers respect it.
  useEffect(() => {
    setMaxCards(maxCards);
  }, [maxCards, setMaxCards]);

  const processTrayPending = useCallback(async (text: string, kind: 'cc' | 'codex') => {
    clearPending();
    if (kind === 'cc') {
      await handleNewSession(text);
    } else {
      const thread = await codexService.threadStart();
      addAgentCard({ kind: 'codex', id: thread.id, preview: text });
      setCurrentAgentCardId(thread.id);
      await codexService.turnStart(thread.id, text, []);
    }
  }, [clearPending, handleNewSession, addAgentCard, setCurrentAgentCardId]);

  useEffect(() => {
    if (!pending) return;
    void processTrayPending(pending.text, pending.kind);
  }, [pending, processTrayPending]);

  useEffect(() => {
    if (!isTauri() || isPhone !== false) {
      return;
    }

    void initializeCodexAsync().catch((error) => {
      console.warn('Failed to initialize codex asynchronously', error);
    });

    // Listen for codex initialized event
    const unlisten = listen<InitializeResponse>('codex:initialized', (event) => {
      console.log('[App] Codex initialized, userAgent:', event.payload.userAgent);
    });

    // Show quit confirmation when Cmd+Q is pressed
    const unlistenQuit = listen('quit-requested', () => {
      setQuitDialogOpen(true);
    });

    // Receive pending send from tray window, hand it off to the main window's send flow
    const unlistenTray = listen<{ kind: 'cc' | 'codex'; text: string }>(
      'tray:pending-send',
      ({ payload }) => {
        const { setView, setActiveSidebarTab } = useLayoutStore.getState();
        setActiveSidebarTab(payload.kind);
        setView('agent');
        useWorkspaceStore.getState().setSelectedAgent(payload.kind);
        useTrayPendingStore.getState().setPending({ kind: payload.kind, text: payload.text });
      }
    );

    return () => {
      unlisten.then((fn) => fn());
      unlistenQuit.then((fn) => fn());
      unlistenTray.then((fn) => fn());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPhone]);

  // Listen to codex events
  useCodexEvents();

  // Wait for platform detection before rendering anything
  if (isPhone === null) return null;

  // Mobile: show connection screen when P2P is in progress or failed (not idle = not logged in yet)
  if (isPhone === true && (p2pState === 'connecting' || p2pState === 'offline' || p2pState === 'error')) {
    return (
      <DesktopOfflineScreen state={p2pState} error={p2pError} retry={p2pRetry} />
    );
  }

  return (
    <>
      <AppLayout />
      <HistoryProjectsDialog />
      <AnalyticsConsentDialog />
      <AlertDialog open={quitDialogOpen} onOpenChange={setQuitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quit Codexia?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to quit? All running agents will be stopped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => invoke('quit_app')}>Quit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function App() {
  useDeepLink(isTauri());

  return (
    <StoreErrorBoundary>
      <AppShell />
    </StoreErrorBoundary>
  );
}
