import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  type CentralSkillItem,
  type SkillScope,
  deleteCentralSkill,
  linkSkillToAgent,
  listCentralSkills,
  uninstallInstalledSkill,
} from '@/services';
import { Loader2, Package, Trash2 } from 'lucide-react';
import { AgentBadge } from './AgentBadge';

export function InstalledTab({
  searchQuery,
  scope,
  cwd,
  refreshKey,
}: {
  searchQuery: string;
  scope: SkillScope;
  cwd: string | null;
  refreshKey: number;
}) {
  const [skills, setSkills] = useState<CentralSkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null); // "<name>:<agent>"
  const [deleteTarget, setDeleteTarget] = useState<CentralSkillItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSkills(await listCentralSkills(scope, cwd ?? undefined));
    } catch (err) {
      toast.error('Failed to load installed skills', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }, [scope, cwd]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const handleToggleAgent = async (skill: CentralSkillItem, agent: 'codex' | 'cc') => {
    const key = `${skill.name}:${agent}`;
    if (togglingKey) return;
    setTogglingKey(key);
    const linked = agent === 'codex' ? skill.linkedCodex : skill.linkedCc;
    try {
      if (linked) {
        await uninstallInstalledSkill(skill.name, agent, scope, cwd ?? undefined);
      } else {
        await linkSkillToAgent(skill.name, agent, scope, cwd ?? undefined);
      }
      await load();
    } catch (err) {
      toast.error(`Failed to ${linked ? 'unlink' : 'link'} ${skill.name}`, {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTogglingKey(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteCentralSkill(deleteTarget.name, scope, cwd ?? undefined);
      setSkills((prev) => prev.filter((s) => s.name !== deleteTarget.name));
      toast.success(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(`Failed to delete ${deleteTarget.name}`, {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(
    () =>
      skills.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [skills, searchQuery]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin" />
        <p className="mt-3 text-sm">Loading…</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4">
          <Package className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="mt-4 font-semibold">
          {searchQuery ? `No results for "${searchQuery}"` : 'No skills installed'}
        </h3>
        {!searchQuery && (
          <p className="mt-1 text-sm text-muted-foreground">
            Browse the marketplace to install skills.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((skill) => (
          <div
            key={skill.name}
            className="group flex flex-col justify-between gap-3 rounded-lg border border-muted/60 bg-card/50 p-4 transition-all hover:border-primary/30 hover:bg-card hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md bg-muted/50 p-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold tracking-tight">{skill.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteTarget(skill)}
                    disabled={Boolean(togglingKey) || deleting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {skill.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{skill.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <AgentBadge
                label="Codex"
                active={skill.linkedCodex}
                loading={togglingKey === `${skill.name}:codex`}
                onClick={() => handleToggleAgent(skill, 'codex')}
              />
              <AgentBadge
                label="CC"
                active={skill.linkedCc}
                loading={togglingKey === `${skill.name}:cc`}
                onClick={() => handleToggleAgent(skill, 'cc')}
              />
            </div>
          </div>
        ))}
      </div>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete skill
            </AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong className="text-foreground">{deleteTarget?.name}</strong> from the
              central store and all agent links?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Deleting</>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
