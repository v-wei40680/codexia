import { useCallback, useEffect, useState } from 'react';
import { Package, FolderGit2, Search, Globe, Package2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BrowseTab } from '@/components/features/skills/BrowseTab';
import { InstalledTab } from '@/components/features/skills/InstalledTab';
import { Clone } from '@/components/features/skills/Clone';
import { useWorkspaceStore } from '@/stores';
import { useLayoutStore } from '@/stores';
import { useTrafficLightConfig } from '@/hooks';
import { ProjectSelector } from '@/components/project-selector';
import { type SkillGroup, type SkillGroupsConfig, type SkillScope, listCentralSkills, readSkillGroups, writeSkillGroups } from '@/services';
import { cn } from '@/lib/utils';
import { AgentSwitcher } from '@/components/common/AgentSwitcher';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

type SkillTab = 'browse' | 'installed' | 'repos';

const NAV_TABS: { value: SkillTab; label: string; icon: React.ElementType }[] = [
  { value: 'browse', label: 'Browse', icon: Globe },
  { value: 'installed', label: 'My Skills', icon: Package },
  { value: 'repos', label: 'Repos', icon: FolderGit2 },
];

export default function SkillsView() {
  const { cwd } = useWorkspaceStore();
  const { isSidebarOpen } = useLayoutStore();
  useTrafficLightConfig(isSidebarOpen);

  const [tab, setTab] = useState<SkillTab>('browse');
  const [scope, setScope] = useState<SkillScope>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [installedRefreshKey, setInstalledRefreshKey] = useState(0);
  const [installedNames, setInstalledNames] = useState<Set<string>>(new Set());
  const [groupsConfig, setGroupsConfig] = useState<SkillGroupsConfig>({ groups: [] });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // New group state
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    listCentralSkills(scope, cwd ?? undefined)
      .then((skills) => setInstalledNames(new Set(skills.map((s) => s.name))))
      .catch(() => { });
  }, [scope, cwd, installedRefreshKey]);

  useEffect(() => {
    readSkillGroups(scope, cwd ?? undefined)
      .then((cfg) => {
        setGroupsConfig(cfg);
        // Clear selection if the selected group no longer exists
        setSelectedGroupId((prev) =>
          prev && cfg.groups.some((g) => g.id === prev) ? prev : null
        );
      })
      .catch(() => { });
  }, [scope, cwd]);



  const saveGroups = useCallback(async (config: SkillGroupsConfig) => {
    setGroupsConfig(config);
    try {
      await writeSkillGroups(scope, cwd ?? undefined, config);
    } catch (err) {
      toast.error('Failed to save groups', {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }, [scope, cwd]);

  const refreshInstalled = useCallback(() => {
    setInstalledRefreshKey((k) => k + 1);
  }, []);

  const handleAddGroup = async () => {
    const name = newGroupName.trim();
    if (!name) { setAddingGroup(false); return; }
    const newGroupId = uuidv4();
    const newGroup: SkillGroup = { id: newGroupId, name, skillNames: [] };
    const updated = { groups: [...groupsConfig.groups, newGroup] };
    await saveGroups(updated);
    setSelectedGroupId(newGroupId);
    setTab('installed');
    setNewGroupName('');
    setAddingGroup(false);
  };

  const handleGroupChipClick = (groupId: string) => {
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
    } else {
      setSelectedGroupId(groupId);
      setTab('installed');
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Drag region */}
      <header className='h-8' data-tauri-drag-region></header>

      {/* Title row */}
      <div>
        <span className="flex items-center justify-between gap-2 px-4 h-12">
          <span className="flex items-center gap-2">
            <Package2 className="shrink-0 h-5 w-5" />
            <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
          </span>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search skills…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-36 pl-8 text-xs bg-muted/30 border-none ring-offset-background focus-visible:ring-1"
            />
          </div>
        </span>

        {/* Scope + agent switcher */}
        <div className="flex items-center justify-between px-4">
          <span className='flex'>
            <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
              {(['user', 'project'] as const).map((s) => (
                <Button
                  key={s}
                  variant="ghost"
                  size="sm"
                  onClick={() => setScope(s)}
                  className={cn(
                    'h-6 px-2.5 text-[10px] uppercase tracking-wider',
                    scope === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  {s}
                </Button>
              ))}
            </div>
            {scope === 'project' && <ProjectSelector />}
          </span>
          <AgentSwitcher />
        </div>

        {/* Groups bar */}
        <div className="flex items-center gap-1.5 px-4 py-1.5 min-h-[32px]">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setAddingGroup(true)}
            title="New group"
          >
            <Plus />
          </Button>
          <div className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
            {/* Default chip — always visible, active when nothing is selected */}
            <button
              type="button"
              onClick={() => setSelectedGroupId(null)}
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap',
                selectedGroupId === null
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-muted text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
              )}
            >
              All groups
            </button>

            {groupsConfig.groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => handleGroupChipClick(g.id)}
                className={cn(
                  'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap',
                  selectedGroupId === g.id
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-muted text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                )}
              >
                {g.name}
                {g.skillNames.length > 0 && (
                  <span className="ml-1 opacity-50">{g.skillNames.length}</span>
                )}
              </button>
            ))}

          </div>
        </div>

        <Dialog open={addingGroup} onOpenChange={setAddingGroup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Skill Group</DialogTitle>
            </DialogHeader>
            <Input
              id="name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddGroup();
              }}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setAddingGroup(false); setNewGroupName(''); }}>
                Cancel
              </Button>
              <Button onClick={() => void handleAddGroup()}>
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Nav tabs */}
      <div className="shrink-0 border-b px-4">
        <nav className="flex gap-0.5">
          {NAV_TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
                tab === value
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {value === 'installed' && installedNames.size > 0 && (
                <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-semibold text-primary">
                  {installedNames.size}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3">
        <div className={tab !== 'browse' ? 'hidden' : ''}>
          <BrowseTab
            searchQuery={searchQuery}
            scope={scope}
            installedIds={installedNames}
            onInstalled={refreshInstalled}
            groupsConfig={groupsConfig}
            onGroupsChange={saveGroups}
            selectedGroupId={selectedGroupId}
          />
        </div>
        <div className={tab !== 'installed' ? 'hidden' : ''}>
          <InstalledTab
            searchQuery={searchQuery}
            scope={scope}
            refreshKey={installedRefreshKey}
            groupsConfig={groupsConfig}
            onGroupsChange={saveGroups}
            selectedGroupId={selectedGroupId}
          />
        </div>
        {tab === 'repos' && <Clone />}
      </div>
    </div>
  );
}
