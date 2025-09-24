import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import supabase, { isSupabaseConfigured } from "@/lib/supabase";
import { profileDefaultsFromMetadata } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams, Navigate } from "react-router-dom";

type Profile = {
  id: string; // auth user id
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  website?: string | null;
  github_url?: string | null;
  x_url?: string | null;
  updated_at?: string | null;
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [search] = useSearchParams();
  const isOnboarding = useMemo(() => search.get("onboarding") === "1", [search]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) {
      setInitialized(true);
      return;
    }

    const load = async () => {
      try {
        const client = supabase!;
        const defaults = profileDefaultsFromMetadata(user);
        const githubFromMetadata = defaults.github_url ?? "";

        const { data, error } = await client
          .from("profiles")
          .select("id, full_name, avatar_url, bio, website, github_url, x_url, updated_at")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        setProfile(
          (data
            ? {
                ...data,
                github_url: data.github_url ?? (githubFromMetadata || ""),
              }
            : {
                id: user.id,
                full_name: defaults.full_name ?? user.user_metadata?.full_name ?? null,
                avatar_url: defaults.avatar_url ?? user.user_metadata?.avatar_url ?? null,
                bio: "",
                website: "",
                github_url: githubFromMetadata,
                x_url: "",
              }) as Profile
        );
      } catch (e: any) {
        setError(e?.message ?? "Failed to load profile");
      } finally {
        setInitialized(true);
      }
    };

    load();
  }, [user]);

  const handleSave = async () => {
    if (!user || !isSupabaseConfigured || !supabase || !profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = {
        id: user.id,
        full_name: profile.full_name ?? null,
        avatar_url: profile.avatar_url ?? null,
        bio: profile.bio ?? null,
        website: profile.website ?? null,
        github_url: profile.github_url ?? null,
        x_url: profile.x_url ?? null,
      };

      const client = supabase!;
      const { error } = await client.from("profiles").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (!loading && !user && !import.meta.env.DEV) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="p-4 mx-auto w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            {isOnboarding
              ? "Complete your profile to continue"
              : "Manage your public profile. Your profile will only be public if you share a project."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupabaseConfigured && (
            <p className="text-sm text-muted-foreground">
              Supabase is not configured. Profile changes will not be persisted.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {initialized && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Display Name</Label>
                <Input
                  id="full_name"
                  placeholder="Your name"
                  value={profile?.full_name ?? ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, full_name: e.target.value } : p))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Short bio"
                  value={profile?.bio ?? ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, bio: e.target.value } : p))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://example.com"
                  value={profile?.website ?? ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, website: e.target.value } : p))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="github">GitHub URL</Label>
                <Input
                  id="github"
                  placeholder="https://github.com/username"
                  value={profile?.github_url ?? ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, github_url: e.target.value } : p))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="x">X (Twitter) URL</Label>
                <Input
                  id="x"
                  placeholder="https://x.com/username"
                  value={profile?.x_url ?? ""}
                  onChange={(e) => setProfile((p) => (p ? { ...p, x_url: e.target.value } : p))}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button disabled={saving} onClick={handleSave}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                {saved && <span className="text-sm text-muted-foreground">Saved</span>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
