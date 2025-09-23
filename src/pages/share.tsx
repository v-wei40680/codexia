import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import supabase, { isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigate, useParams } from "react-router-dom";

type ProjectForm = {
  id?: string;
  user_id: string;
  title: string;
  description?: string | null;
  url?: string | null;
};

export default function ShareProjectPage() {
  const { user, loading } = useAuth();
  const params = useParams();
  const projectId = params.id as string | undefined;
  // Local, add-only form (do not fetch previous entries)
  const [form, setForm] = useState<ProjectForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Initialize form: if editing, load project; otherwise empty add form
  useEffect(() => {
    const init = async () => {
      if (!user) {
        setForm(null);
        return;
      }
      if (projectId && isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from("projects")
            .select("id, user_id, title, description, url")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .maybeSingle();
          if (error) throw error;
          if (data) {
            setForm({
              id: data.id as string,
              user_id: data.user_id as string,
              title: (data.title as string) || "",
              description: (data.description as string | null) ?? "",
              url: (data.url as string | null) ?? "",
            });
          } else {
            setError("Project not found or not accessible");
            setForm({ user_id: user.id, title: "", description: "", url: "" });
          }
        } catch (e: any) {
          setError(e?.message ?? "Failed to load project");
          setForm({ user_id: user.id, title: "", description: "", url: "" });
        }
      } else {
        setForm({ user_id: user.id, title: "", description: "", url: "" });
      }
    };
    init();
  }, [user, projectId]);

  const handleSave = async () => {
    if (!user || !isSupabaseConfigured || !supabase || !form) return;
    if (!form.title) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const client = supabase!;
      if (form.id) {
        const { error } = await client
          .from("projects")
          .update({
            title: form.title,
            description: form.description ?? null,
            url: form.url ?? null,
          })
          .eq("id", form.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await client
          .from("projects")
          .insert({
            user_id: user.id,
            title: form.title,
            description: form.description ?? null,
            url: form.url ?? null,
          });
        if (error) throw error;
      }
      setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  if (!loading && !user && !import.meta.env.DEV) {
    return <Navigate to="/login" replace />;
  }

  return (
    // No internal scrolling here to respect Layout's header + no-scroll requirement
    <div className="p-4 mx-auto w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{projectId ? "Edit Project" : "Share Your Project"}</CardTitle>
          <CardDescription>
            {projectId ? "Update your shared project." : "Add a new project to your public page."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupabaseConfigured && (
            <p className="text-sm text-muted-foreground">
              Supabase is not configured. Project changes will not be persisted.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {form && (
            <div className="space-y-6">
              <div className="space-y-4 border rounded-md p-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    placeholder="Awesome Project"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    placeholder="Short description (what, why, how)"
                    value={form.description ?? ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="url">Project URL</Label>
                  <Input
                    id="url"
                    placeholder="https://example.com"
                    value={form.url ?? ""}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button disabled={!form.title || saving} onClick={handleSave}>
                    {saving ? (projectId ? "Updating..." : "Saving...") : projectId ? "Update" : "Save"}
                  </Button>
                  {saved && <span className="text-sm text-muted-foreground">Saved</span>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
