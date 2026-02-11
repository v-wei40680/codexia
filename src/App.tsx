import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import './App.css';
import { useCodexEvents } from '@/hooks/codex';
import { useDeepLink } from '@/hooks/useDeepLink';
import { AppLayout } from '@/components/layout';

function AppShell() {
  useEffect(() => {
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

  return <AppLayout />;
}

export default function App() {
  useDeepLink();

  return <AppShell />;
}
