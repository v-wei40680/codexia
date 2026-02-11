import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clone } from './Clone';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
import { Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '@/stores';

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

  const targetInstallPath =
    scope === 'project'
      ? `${cwd || '<project cwd>'}/${selectedAgent === 'codex' ? '.agents' : '.claude'}/skills`
      : selectedAgent === 'codex'
        ? '$CODEX_HOME/skills (default: ~/.codex/skills)'
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
    <div className="h-full w-full">
      <Tabs defaultValue="skills" className="w-full">
        <div className="mb-3 flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="skills">Marketplace</TabsTrigger>
            <TabsTrigger value="installed">Installed</TabsTrigger>
            <TabsTrigger value="new">New Skill</TabsTrigger>
          </TabsList>

          <span className="flex">
            <Button
              variant="ghost"
              className={`${scope === 'user' ? 'bg-accent' : ''}`}
              onClick={() => {
                setScope('user');
              }}
            >
              User
            </Button>
            <Button
              variant="ghost"
              className={`${scope === 'project' ? 'bg-accent' : ''}`}
              onClick={() => {
                setScope('project');
              }}
            >
              Project
            </Button>
          </span>
        </div>
        <TabsContent value="skills">
          <h2>Skills marketplace</h2>
          <div className="mt-3 space-y-2">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {!loading && skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills found in ~/.agents/plugins</p>
            ) : null}
            {skills.map((skill) => (
              <Card key={skill.skillMdPath} className="w-full">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{skill.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {skill.description || 'No description'}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleInstall(skill)}
                    disabled={Boolean(installingName) || skill.installed}
                    variant={skill.installed ? 'secondary' : 'default'}
                  >
                    {skill.installed
                      ? 'Installed'
                      : installingName === skill.name
                        ? 'Installing...'
                        : `Install to ${selectedAgent}/${scope}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="installed">
          <h2>Installed skills</h2>
          <div className="mt-3 space-y-2">
            {loadingInstalled ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {!loadingInstalled && installedSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No skills found in {targetInstallPath}
              </p>
            ) : null}
            {installedSkills.map((skill) => (
              <Card key={skill.path} className="w-full">
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{skill.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {skill.description || 'No description'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <code>{skill.path}</code>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setSkillToUninstall(skill)}
                    disabled={Boolean(uninstallingName)}
                    title="Uninstall skill"
                    aria-label={`Uninstall ${skill.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="new">
          <Clone />
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uninstall skill?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{' '}
              <code>
                {targetInstallPath}/{skillToUninstall?.name}
              </code>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(uninstallingName)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleUninstall();
              }}
              disabled={Boolean(uninstallingName)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {uninstallingName ? 'Uninstalling...' : 'Uninstall'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
