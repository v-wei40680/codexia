import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import './App.css';
import { useCodexEvents } from '@/hooks/codex';
import { useDeepLink } from '@/hooks/useDeepLink';
import { AppLayout } from '@/components/layout';
import { isTauri } from '@/hooks/runtime';
import { HistoryProjectsDialog } from '@/components/project-selector';

function AppShell() {
  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    // Listen for codex connected event
    const unlisten = listen('codex:notification', (event: any) => {
      const notification = event.payload;
      if (notification?.method === 'codex/connected') {
        console.log('Codex connected and initialized');
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Listen to codex events
  useCodexEvents();

  return (
    <>
      <AppLayout />
      <HistoryProjectsDialog />
    </>
  );
}

export default function App() {
  if (isTauri()) {
    useDeepLink();
  }

  return <AppShell />;
}
