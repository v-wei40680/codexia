import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import supabase, { isSupabaseConfigured } from "@/lib/supabase";
import { ensureProfileRecord, mapProfileRow, type ProfileRecord } from "@/lib/profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Github, Twitter } from "lucide-react";

type Profile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  website?: string | null;
  github_url?: string | null;
  x_url?: string | null;
};

function profileFromRecord(record: ProfileRecord | null): Profile | null {
  if (!record) return null;
  return {
    id: record.id,
    bio: record.bio,
    website: record.website,
    github_url: record.github_url,
    x_url: record.x_url,
    full_name: record.full_name ?? null,
    avatar_url: record.avatar_url ?? null,
  };
}

export default function PublicUserPage() {
  const params = useParams();
  const userId = params.id as string | undefined;
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isOwner = !!(me && userId && me.id === userId);

  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setError("Missing user id");
        setLoading(false);
        return;
      }
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured");
        setLoading(false);
        return;
      }
      try {
        const client = supabase!;
        const [{ data: p, error: perr }] = await Promise.all([
          client
            .from("profiles")
            .select("id, full_name, avatar_url, bio, website, github_url, x_url")
            .eq("id", userId)
            .maybeSingle(),
        ]);
        if (perr) throw perr;

        const existing = mapProfileRow(p);

        if (!existing && isOwner && me) {
          const ensured = await ensureProfileRecord(me);
          if (ensured) {
            setProfile(profileFromRecord(ensured));
          } else {
            setProfile({ id: userId } as Profile);
          }
        } else if (!existing) {
          // If profile absent, fall back to a placeholder so projects can still show
          setProfile({ id: userId } as Profile);
        } else {
          setProfile(profileFromRecord(existing));
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to load user");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, isOwner, me]);

  return (
    <div className="p-4 mx-auto w-full max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Public Profile</CardTitle>
          <CardDescription>View a user's profile</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && profile && (
            <div className="flex gap-4 items-start">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted inline-flex items-center justify-center text-xl">
                  {(profile.full_name?.charAt(0).toUpperCase() || "U")}
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{profile.full_name || "Unnamed"}</h2>
                  {profile.website && (
                    <Badge asChild>
                      <a href={profile.website} target="_blank" rel="noreferrer">
                        Website
                      </a>
                    </Badge>
                  )}
                </div>
                {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
                <div className="flex gap-3 text-sm">
                  {profile.github_url && (
                    <a className="flex hover:underline align-center" href={profile.github_url} target="_blank" rel="noreferrer">
                      <Github /> @{profile.github_url.replace(/\/+$/, "").split("/").pop()}
                    </a>
                  )}
                  {profile.x_url && (
                    <a className="flex hover:underline" href={profile.x_url} target="_blank" rel="noreferrer">
                      <Twitter /> @{profile.x_url.replace(/\/+$/, "").split("/").pop()}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
