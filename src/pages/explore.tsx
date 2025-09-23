import { useEffect, useMemo, useState } from "react";
import supabase, { isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

type Project = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  updated_at?: string | null;
};

type Profile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

export default function ExploreProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [projectCount, setProjectCount] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured; cannot load public projects.");
        setLoading(false);
        return;
      }
      try {
        const client = supabase!;
        const { data, error } = await client
          .from("projects")
          .select("id, user_id, title, description, url, updated_at")
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(50);
        if (error) throw error;
        const list = (data ?? []) as Project[];
        setProjects(list);
        const userIds = Array.from(new Set(list.map((p) => p.user_id)));
        if (userIds.length) {
          const { data: profs, error: perr } = await client
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", userIds);
          if (!perr && profs) {
            const map: Record<string, Profile> = {};
            for (const p of profs as Profile[]) map[p.id] = p;
            setProfiles(map);
          }
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Determine how many projects current user has (for CTA text)
  useEffect(() => {
    const checkOwn = async () => {
      if (!user || !isSupabaseConfigured || !supabase) {
        setProjectCount(0);
        return;
      }
      try {
        const client = supabase!;
        const { data, error } = await client
          .from("projects")
          .select("id")
          .eq("user_id", user.id)
          .limit(2);
        if (!error && Array.isArray(data)) setProjectCount(data.length);
        else setProjectCount(0);
      } catch {
        setProjectCount(0);
      }
    };
    checkOwn();
  }, [user]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((p) =>
      [p.title, p.description, profiles[p.user_id]?.full_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query))
    );
  }, [q, projects, profiles]);

  return (
    <div className="p-4 mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Explore Projects</h1>
          <p className="text-muted-foreground">Discover what others are building</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Input
              placeholder="Search projects or authors"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button
            onClick={() => navigate(user ? (projectCount > 0 ? "/profile" : "/share") : "/login")}
            title={projectCount > 0 ? "Manage your projects" : "Add your project"}
          >
            {projectCount > 0 ? "Manage your projects" : "Add your project"}
          </Button>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <p className="text-sm text-muted-foreground">
          Supabase not configured. This directory requires a backend.
        </p>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const author = profiles[p.user_id];
            return (
              <Card key={p.id} className="hover:shadow transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {p.title}
                      </a>
                    ) : (
                      p.title
                    )}
                  </CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-2">
                      <Link className="hover:underline" to={`/u/${p.user_id}`}>
                        {author?.full_name || "Unknown"}
                      </Link>
                      <Badge variant="secondary">{new Date(p.updated_at || Date.now()).toLocaleDateString()}</Badge>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                    {p.description || "No description"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground">No projects match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}
