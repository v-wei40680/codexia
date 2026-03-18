import { useEffect, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import { useCodexEvents } from '@/hooks/codex';
import { useDeepLink } from '@/hooks/useDeepLink';
import { AppLayout } from '@/components/layout';
import { isTauri } from '@/hooks/runtime';
import { HistoryProjectsDialog } from '@/components/project-selector';
import { AnalyticsConsentDialog } from '@/components/settings/AnalyticsConsentDialog';
import { initializeCodexAsync } from '@/services/tauri';
import type { InitializeResponse } from './bindings';
import { useAgentCenterStore, useLayoutStore } from '@/stores';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useTrayPendingStore } from '@/stores/useTrayPendingStore';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { codexService } from '@/services/codexService';
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
  const { pending, clearPending } = useTrayPendingStore();
  const { handleNewSession } = useCCSessionManager();
  const { addAgentCard, setCurrentAgentCardId } = useAgentCenterStore();

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
    if (!isTauri()) {
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
        const { setView, setActiveSidebarTab, setIsAgentExpanded } = useLayoutStore.getState();
        setActiveSidebarTab(payload.kind);
        setView('agent');
        setIsAgentExpanded(true);
        useWorkspaceStore.getState().setSelectedAgent(payload.kind);
        useTrayPendingStore.getState().setPending({ kind: payload.kind, text: payload.text });
      }
    );

    return () => {
      unlisten.then((fn) => fn());
      unlistenQuit.then((fn) => fn());
      unlistenTray.then((fn) => fn());
    };
  }, []);

  // Listen to codex events
  useCodexEvents();

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
  if (isTauri()) {
    useDeepLink();
  }

  return <AppShell />;
}
