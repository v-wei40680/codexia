import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Clone } from './Clone';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  installMarketplaceSkill,
  listInstalledSkills,
  listMarketplaceSkills,
  type SkillScope,
  uninstallInstalledSkill,
  type InstalledSkillItem,
  type MarketplaceSkillItem,
} from '@/services';
import { toast } from '@/components/ui/use-toast';
import { Trash2, Search, Puzzle, Package, CheckCircle, Download, Info, SearchX, Terminal } from 'lucide-react';
import { useWorkspaceStore } from '@/stores';
import { cn } from '@/lib/utils';

export function SkillsView() {
  const [skills, setSkills] = useState<Array<MarketplaceSkillItem>>([]);
  const { cwd, selectedAgent } = useWorkspaceStore();
  const [scope, setScope] = useState<SkillScope>('user');
  const [installedSkills, setInstalledSkills] = useState<Array<InstalledSkillItem>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInstalled, setLoadingInstalled] = useState(false);
  const [installingName, setInstallingName] = useState<string | null>(null);
  const [uninstallingName, setUninstallingName] = useState<string | null>(null);
  const [skillToUninstall, setSkillToUninstall] = useState<InstalledSkillItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const targetInstallPath =
    scope === 'project'
      ? `${cwd || '<project cwd>'}/${selectedAgent === 'codex' ? '.agents' : '.claude'}/skills`
      : selectedAgent === 'codex'
        ? '$CODEX_HOME/skills'
        : '~/.claude/skills';

  const loadSkills = async () => {
    setLoading(true);
    try {
      const data = await listMarketplaceSkills(selectedAgent, scope, cwd || undefined);
      setSkills(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to load marketplace skills', {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInstalledSkills = async () => {
    setLoadingInstalled(true);
    try {
      const data = await listInstalledSkills(selectedAgent, scope, cwd || undefined);
      setInstalledSkills(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to load installed skills', {
        description: message,
      });
    } finally {
      setLoadingInstalled(false);
    }
  };

  useEffect(() => {
    void loadSkills();
    void loadInstalledSkills();
  }, [selectedAgent, scope, cwd]);

  const filteredMarketplaceSkills = useMemo(() => {
    return skills.filter(skill =>
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [skills, searchQuery]);

  const filteredInstalledSkills = useMemo(() => {
    return installedSkills.filter(skill =>
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [installedSkills, searchQuery]);

  const handleInstall = async (skill: MarketplaceSkillItem) => {
    if (skill.installed || installingName) {
      return;
    }
    setInstallingName(skill.name);
    try {
      await installMarketplaceSkill(
        skill.skillMdPath,
        skill.name,
        selectedAgent,
        scope,
        cwd || undefined
      );
      await loadSkills();
      await loadInstalledSkills();
      toast.success(`Installed ${skill.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to install ${skill.name}`, {
        description: message,
      });
    } finally {
      setInstallingName(null);
    }
  };

  const handleUninstall = async () => {
    if (!skillToUninstall || uninstallingName) {
      return;
    }
    setUninstallingName(skillToUninstall.name);
    try {
      await uninstallInstalledSkill(skillToUninstall.name, selectedAgent, scope, cwd || undefined);
      setInstalledSkills((prev) => prev.filter((item) => item.path !== skillToUninstall.path));
      setSkills((prev) =>
        prev.map((item) =>
          item.name === skillToUninstall.name ? { ...item, installed: false } : item
        )
      );
      toast.success(`Uninstalled ${skillToUninstall.name}`);
      setSkillToUninstall(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to uninstall ${skillToUninstall.name}`, {
        description: message,
      });
    } finally {
      setUninstallingName(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <Tabs defaultValue="skills" className="flex h-full min-h-0 w-full flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="skills" className="h-8 gap-2">
              <Package className="h-3.5 w-3.5" />
              <span>Browse</span>
            </TabsTrigger>
            <TabsTrigger value="installed" className="h-8 gap-2">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Installed</span>
            </TabsTrigger>
            <TabsTrigger value="new" className="h-8 gap-2">
              <Puzzle className="h-3.5 w-3.5" />
              <span>New</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48 pl-8 text-xs bg-muted/30 border-none ring-offset-background focus-visible:ring-1"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 px-3 text-[10px] uppercase tracking-wider',
                  scope === 'user' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                )}
                onClick={() => setScope('user')}
              >
                User
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 px-3 text-[10px] uppercase tracking-wider',
                  scope === 'project' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                )}
                onClick={() => setScope('project')}
              >
                Project
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value="skills" className="mt-0 flex-1 min-h-0 overflow-y-auto pr-2">
          <div className="space-y-3 pb-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-4 text-sm font-medium">Loading marketplace...</p>
              </div>
            ) : filteredMarketplaceSkills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4">
                  <SearchX className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No skills found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchQuery ? `No results for "${searchQuery}"` : 'The marketplace is empty or could not be loaded.'}
                </p>
              </div>
            ) : (
              filteredMarketplaceSkills.map((skill) => (
                <Card key={skill.skillMdPath} className="group overflow-hidden border-muted/60 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="mt-1 rounded-lg bg-muted/50 p-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <Puzzle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-foreground">{skill.name}</p>
                          {skill.installed && (
                            <Badge variant="secondary" className="h-4 px-1 text-[9px] font-bold">
                              INSTALLED
                            </Badge>
                          )}
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          {skill.description || 'Enhance your AI assistant with this productivity-boosting skill.'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleInstall(skill)}
                      disabled={Boolean(installingName) || skill.installed}
                      variant={skill.installed ? 'outline' : 'default'}
                      size="sm"
                      className={cn(
                        "transition-all",
                        skill.installed ? "opacity-50" : "bg-primary hover:bg-primary/90"
                      )}
                    >
                      {skill.installed ? (
                        <>
                          <CheckCircle className="mr-2 h-3.5 w-3.5" />
                          Installed
                        </>
                      ) : installingName === skill.name ? (
                        <>
                          <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                          Installing
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-3.5 w-3.5" />
                          Install
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="installed" className="mt-0 flex-1 min-h-0 overflow-y-auto pr-2">
          <div className="mb-4 rounded-lg bg-blue-500/5 p-3 border border-blue-500/10 flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-xs text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
              These skills are currently available for <strong>{selectedAgent}</strong> in the <strong>{scope}</strong> scope.
              <br />
              <code className="mt-1 block opacity-70">{targetInstallPath}</code>
            </div>
          </div>

          <div className="space-y-3 pb-4">
            {loadingInstalled ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-4 text-sm font-medium">Loading installed skills...</p>
              </div>
            ) : filteredInstalledSkills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No skills installed</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchQuery ? `No results for "${searchQuery}"` : 'Browse the marketplace to find and install skills.'}
                </p>
              </div>
            ) : (
              filteredInstalledSkills.map((skill) => (
                <Card key={skill.path} className="group overflow-hidden border-muted/60 transition-all hover:border-destructive/20">
                  <CardContent className="flex items-start justify-between gap-4 p-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="mt-1 rounded-lg bg-muted p-2 text-muted-foreground">
                        <Terminal className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-semibold text-foreground">{skill.name}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          {skill.description || 'This skill is ready to help you with your daily tasks.'}
                        </p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-mono opacity-50">
                            {skill.path.split('/').pop()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                      onClick={() => setSkillToUninstall(skill)}
                      disabled={Boolean(uninstallingName)}
                      title="Uninstall skill"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="new" className="mt-0 flex-1 min-h-0 overflow-y-auto">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-6 text-xl font-semibold">Create New Skill</h2>
            <Clone />
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={Boolean(skillToUninstall)}
        onOpenChange={(open) => {
          if (!open && !uninstallingName) {
            setSkillToUninstall(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Uninstall Skill
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to uninstall <strong className="text-foreground">{skillToUninstall?.name}</strong>?
              This will remove its files from your {scope} directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={Boolean(uninstallingName)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleUninstall();
              }}
              disabled={Boolean(uninstallingName)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {uninstallingName ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-destructive-foreground border-t-transparent" />
                  Uninstalling
                </>
              ) : (
                'Confirm Uninstall'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
