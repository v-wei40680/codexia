import { Button } from "@/components/ui/button";
import supabase, { isSupabaseConfigured } from "@/lib/supabase";
import { open } from "@tauri-apps/plugin-shell";
import { Github } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSettingsStore } from "@/stores/SettingsStore";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const {windowTitle} = useSettingsStore();
  const hasRedirect = Boolean(import.meta.env.VITE_REDIRECT_URL);
  const ENABLE_AUTH = import.meta.env.VITE_ENABLE_AUTH === 'true';

  // In development, skip login only if auth is not forced
  if (import.meta.env.DEV && !ENABLE_AUTH) {
    return <Navigate to="/" replace />;
  }

  // If Supabase is not configured, don't attempt OAuth. Show guidance.
  if (!isSupabaseConfigured || !hasRedirect) {
    // If auth isn't forced, don't block the user on a login screen in Tauri.
    if (!ENABLE_AUTH) {
      return <Navigate to="/" replace />;
    }

    // Auth is forced but not configured: show guidance only.
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to {windowTitle}</h1>
        <p className="mb-6 text-gray-500 dark:text-gray-400">
          Authentication is not configured. Add VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_REDIRECT_URL in your .env.
        </p>
      </div>
    );
  }

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleOAuthLogin = async (provider: "github" | "google") => {
    try {
      const { data } = await supabase!.auth.signInWithOAuth({
        provider,
        options: {
          skipBrowserRedirect: true,
          redirectTo: import.meta.env.VITE_REDIRECT_URL,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (!data?.url) throw new Error("No auth URL returned");
      open(data.url);
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      throw error;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to {windowTitle}</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">Sign in to get more</p>

      <div className="w-full max-w-sm">
        <Button
          onClick={() => handleOAuthLogin("github")}
          className="w-full flex items-center justify-center gap-2 mb-4"
        >
          <Github />
          Continue with GitHub
        </Button>
        <Button
          onClick={() => handleOAuthLogin("google")}
          className="w-full flex items-center justify-center gap-2"
          variant="outline"
        >
          <span className="text-sm">🔍</span>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
