import { useCallback, useEffect, useState } from 'react';
import { Package, FolderGit2, Search, Globe, Package2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BrowseTab } from '@/components/features/skills/BrowseTab';
import { InstalledTab } from '@/components/features/skills/InstalledTab';
import { Clone } from '@/components/features/skills/Clone';
import { useWorkspaceStore } from '@/stores';
import { useLayoutStore } from '@/stores';
import { useTrafficLightConfig } from '@/hooks';
import { ProjectSelector } from '@/components/project-selector';
import { type SkillScope, listCentralSkills } from '@/services';
import { cn } from '@/lib/utils';
import { AgentSwitcher } from '@/components/common/AgentSwitcher';

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

  useEffect(() => {
    listCentralSkills(scope, cwd ?? undefined)
      .then((skills) => setInstalledNames(new Set(skills.map((s) => s.name))))
      .catch(() => { });
  }, [scope, cwd, installedRefreshKey]);

  const refreshInstalled = useCallback(() => {
    setInstalledRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className='h-8' data-tauri-drag-region></header>
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
                    scope === s
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground',
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
      </div>

      {/* Nav bar */}
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
          />
        </div>
        <div className={tab !== 'installed' ? 'hidden' : ''}>
          <InstalledTab
            searchQuery={searchQuery}
            scope={scope}
            refreshKey={installedRefreshKey}
          />
        </div>
        {tab === 'repos' && <Clone />}
      </div>
    </div>
  );
}
