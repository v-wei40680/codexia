import supabase from '@/lib/supabase';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const processedUrls = new Set<string>();

// useDeepLink hook: handles deep link auth
export const useDeepLink = (enabled = true) => {
  const [isHandlingDeepLink, setIsHandlingDeepLink] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsHandlingDeepLink(false);
      return;
    }
    const handleUrl = async (urls: string[] | string) => {
      const url = Array.isArray(urls) ? urls[0] : urls;
      if (!url || processedUrls.has(url)) {
        return;
      }

      // Mark as processed BEFORE any async operations to prevent race conditions
      processedUrls.add(url);

      try {
        setIsHandlingDeepLink(true);
        const urlObj = new URL(url);
        const searchParams = new URLSearchParams(urlObj.search.substring(1));
        const code = searchParams.get('code');

        if (code && supabase) {
          // Check if already authenticated (skip if already logged in)
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            return;
          }

          // Check if code verifier exists
          const codeVerifier = localStorage.getItem('supabase.auth.token-code-verifier');
          if (!codeVerifier) {
            console.error('Code verifier not found in localStorage');
            toast.error('Authentication state missing. Please try again.');
            return;
          }

          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('Exchange code error:', error);
            throw error;
          }

          if (data.session) {
            toast.success('User authenticated successfully');
            // Reload page to reset app state
            window.location.reload();
            return;
          }
        }
      } catch (err) {
        // DON'T remove from processedUrls - we don't want to retry
        console.error('Deep link authentication error:', err);
        toast.error('Authentication failed. Please sign in again.');
      } finally {
        setIsHandlingDeepLink(false);
      }
    };

    const setupDeepLinkHandlers = async () => {
      try {
        try {
          const current = await getCurrent();
          if (current && current.length) {
            await handleUrl(current);
          }
        } catch (err) {
          console.error('Failed to read current deep link', err);
        }
      } catch (err) {
        console.error('Failed to read current deep link', err);
      }

      let pluginUnlisten: UnlistenFn | null = null;
      try {
        pluginUnlisten = await onOpenUrl((incoming) => {
          void handleUrl(incoming);
        });
      } catch (err) {
        console.error('Failed to register deep link handler', err);
      }

      let eventUnlisten: UnlistenFn | null = null;
      try {
        eventUnlisten = await listen<string>('deep-link-received', (event) => {
          void handleUrl(event.payload);
        });
      } catch (err) {
        console.error('Failed to register native deep link listener', err);
      }

      if (!pluginUnlisten && !eventUnlisten) {
        return null;
      }

      return () => {
        pluginUnlisten?.();
        eventUnlisten?.();
      };
    };

    let dispose: UnlistenFn | null = null;
    void setupDeepLinkHandlers().then((unlisten) => {
      dispose = unlisten ?? null;
    });

    return () => {
      dispose?.();
      processedUrls.clear();
    };
  }, [enabled]);

  return isHandlingDeepLink;
};
