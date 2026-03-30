import { useCallback, useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BrowseTab } from '@/components/features/skills/BrowseTab';
import { useWorkspaceStore, useLayoutStore, usePluginStore } from '@/stores';
import { useTrafficLightConfig } from '@/hooks';
import { type SkillGroup, type SkillGroupsConfig, listCentralSkills, readSkillGroups, writeSkillGroups } from '@/services';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

export default function SkillsView() {
  const { cwd } = useWorkspaceStore();
  const { isSidebarOpen } = useLayoutStore();
  const { skillScope: scope } = usePluginStore();
  useTrafficLightConfig(isSidebarOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const [installedRefreshKey, setInstalledRefreshKey] = useState(0);
  const [installedNames, setInstalledNames] = useState<Set<string>>(new Set());
  const [groupsConfig, setGroupsConfig] = useState<SkillGroupsConfig>({ groups: [] });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    listCentralSkills(scope, cwd ?? undefined)
      .then((skills) => setInstalledNames(new Set(skills.map((s) => s.name))))
      .catch(() => { });
  }, [scope, cwd, installedRefreshKey]);

  useEffect(() => {
    readSkillGroups()
      .then((cfg) => {
        setGroupsConfig(cfg);
        setSelectedGroupId((prev) =>
          prev && cfg.groups.some((g) => g.id === prev) ? prev : null
        );
      })
      .catch(() => { });
  }, []);

  const saveGroups = useCallback(async (config: SkillGroupsConfig) => {
    setGroupsConfig(config);
    try {
      await writeSkillGroups(config);
    } catch (err) {
      toast.error('Failed to save groups', {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

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
    setNewGroupName('');
    setAddingGroup(false);
  };

  const handleGroupChipClick = (groupId: string) => {
    setSelectedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  return (
    <div className="flex flex-col h-full">

      <div>
        <span className="flex items-center justify-between gap-2 px-4 h-12">
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

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3">
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
    </div>
  );
}
