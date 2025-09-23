import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import supabase, { isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type Project = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  url?: string | null;
};

export default function PublicUserPage() {
  const params = useParams();
  const userId = params.id as string | undefined;
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
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
        const [{ data: p, error: perr }, { data: prj, error: jerr }] = await Promise.all([
          client
            .from("profiles")
            .select("id, full_name, avatar_url, bio, website, github_url, x_url")
            .eq("id", userId)
            .maybeSingle(),
          client
            .from("projects")
            .select("id, user_id, title, description, url")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .limit(2),
        ]);
        if (perr) throw perr;
        // If profile absent, fall back to a placeholder so projects can still show
        if (!p) {
          setProfile({ id: userId } as Profile);
        } else {
          setProfile(p as Profile);
        }
        if (!jerr && Array.isArray(prj)) setProjects(prj as Project[]);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load user");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  return (
    <div className="p-4 mx-auto w-full max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Public Profile</CardTitle>
          <CardDescription>View a user's profile and shared project</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>Shared Project</CardTitle>
          <CardDescription>The user's current shared project</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!loading && !error && (
            projects.length > 0 ? (
              <div className="space-y-6">
                {projects.map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold">
                        {project.url ? (
                          <a href={project.url} className="hover:underline" target="_blank" rel="noreferrer">
                            {project.title}
                          </a>
                        ) : (
                          project.title
                        )}
                      </h3>
                      {isOwner && (
                        <Button asChild size="sm" variant="secondary">
                          <Link to={`/share/${project.id}`}>Edit</Link>
                        </Button>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No project shared.</p>
            )
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Want to share yours? <Link to="/share" className="underline">Share a project</Link>
      </div>
    </div>
  );
}
