import supabase from "@/lib/supabase";
import { ensureProfileRecord, mapProfileRow } from "@/lib/profile";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const processedUrls = new Set<string>();

// useDeepLink hook: handles deep link auth
export const useDeepLink = () => {
  const navigate = useNavigate();
  const [isHandlingDeepLink, setIsHandlingDeepLink] = useState(false);

  useEffect(() => {
    const handleUrl = async (urls: string[] | string) => {
      const url = Array.isArray(urls) ? urls[0] : urls;
      if (!url || processedUrls.has(url)) {
        return;
      }
      try {
        processedUrls.add(url);

        setIsHandlingDeepLink(true);
        const urlObj = new URL(url);
        const searchParams = new URLSearchParams(urlObj.search.substring(1));

        const code = searchParams.get("code");
        if (code && supabase) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (data.session) {
            try {
              const user = data.session.user;
              const { data: profileRow } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url, bio, website, github_url, x_url, updated_at")
                .eq("id", user.id)
                .maybeSingle();

              const profile = mapProfileRow(profileRow);
              if (!profile) {
                await ensureProfileRecord(user);
              }

              toast.success("User authenticated successfully");
              navigate("/", { replace: true });
              return;
            } catch {
              toast.success("User authenticated successfully");
              navigate("/", { replace: true });
              return;
            }
          }
        }
      } catch (err) {
        processedUrls.delete(url);
        toast.error("Authentication failed. Please sign in again.");
        navigate("/login", { replace: true });
      } finally {
        setIsHandlingDeepLink(false);
      }
    };

    const setupDeepLinkHandlers = async () => {
      try {
        const current = await getCurrent();
        if (current && current.length) {
          await handleUrl(current);
        }
      } catch (err) {
        console.error("Failed to read current deep link", err);
      }

      let pluginUnlisten: UnlistenFn | null = null;
      try {
        pluginUnlisten = await onOpenUrl((incoming) => {
          void handleUrl(incoming);
        });
      } catch (err) {
        console.error("Failed to register deep link handler", err);
      }

      let eventUnlisten: UnlistenFn | null = null;
      try {
        eventUnlisten = await listen<string>("deep-link-received", (event) => {
          void handleUrl(event.payload);
        });
      } catch (err) {
        console.error("Failed to register native deep link listener", err);
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
  }, [navigate]);

  return isHandlingDeepLink;
};
