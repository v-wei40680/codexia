import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import supabase, { isSupabaseConfigured } from "@/lib/supabase";
import { ensureProfileRecord, mapProfileRow, type ProfileRecord } from "@/lib/profile";
import { Github } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSettingsStore } from "@/stores/SettingsStore";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isRemoteRuntime } from "@/lib/tauri-proxy";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const { windowTitle } = useSettingsStore();
  const [redirect, setRedirect] = useState<string | null>(null);
  const [email, setEmail] = useState(() => localStorage.getItem("email") || "");
  const [password, setPassword] = useState("");
  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const remoteMode = isRemoteRuntime();

  useEffect(() => {
    const decideRedirect = async () => {
      if (loading || !user) return;
      if (!isSupabaseConfigured || !supabase) {
        setRedirect("/");
        return;
      }
      try {
        const client = supabase!;
        const { data, error } = await client
          .from("profiles")
          .select("id, bio, website, github_url, x_url")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        const profile: ProfileRecord | null = mapProfileRow(data);
        if (!profile) {
          await ensureProfileRecord(user);
        }
        // Always send the user home; specific routes remain gated by useProfileStatus.
        setRedirect("/");
      } catch (_e) {
        setRedirect("/");
      }
    };
    decideRedirect();
  }, [loading, user]);

  if (redirect) {
    return <Navigate to={redirect} replace />;
  }

  const handleOAuthLogin = async (provider: "github") => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const client = supabase!;
      const { data } = await client.auth.signInWithOAuth({
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

  // Email + password sign up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      setFormError("Authentication is not configured");
      return;
    }
    setLoadingForm(true);
    setFormError(null);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast.success("Please check your email to confirm");
    } catch (err: any) {
      setFormError(err?.message || "Sign up failed");
    } finally {
      setLoadingForm(false);
    }
  };

  // Email + password sign in
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      setFormError("Authentication is not configured");
      return;
    }
    setLoadingForm(true);
    setFormError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in");
      // Redirect is handled by the effect that checks profile completeness.
    } catch (err: any) {
      setFormError(err?.message || "Sign in failed");
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to {windowTitle}</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">Sign in to get more</p>

      <div className="w-full max-w-sm text-left">
        {(import.meta.env.DEV || remoteMode) &&
          <>
            <Tabs defaultValue="signin" className="w-full mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        localStorage.setItem("email", e.target.value);
                      }}
                      required
                      disabled={!isSupabaseConfigured || loadingForm}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={!isSupabaseConfigured || loadingForm}
                    />
                  </div>
                  {formError && <p className="text-red-500 text-sm">{formError}</p>}
                  <Button type="submit" className="w-full" disabled={!isSupabaseConfigured || loadingForm}>
                    {loadingForm ? "Loading..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={!isSupabaseConfigured || loadingForm}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={!isSupabaseConfigured || loadingForm}
                    />
                  </div>
                  {formError && <p className="text-red-500 text-sm">{formError}</p>}
                  <Button type="submit" className="w-full" disabled={!isSupabaseConfigured || loadingForm}>
                    {loadingForm ? "Loading..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
          </>
        }

        <Button
          onClick={() => handleOAuthLogin("github")}
          className="w-full flex items-center justify-center gap-2 mb-4"
          disabled={!isSupabaseConfigured}
        >
          <Github />
          Continue with GitHub
        </Button>
      </div>
    </div>
  );
}
