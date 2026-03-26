import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  type SkillScope,
  listCentralSkills,
} from '@/services';
import {
  FolderGit2,
  Package,
  Puzzle,
  Search,
} from 'lucide-react';
import { useWorkspaceStore } from '@/stores';
import { cn } from '@/lib/utils';
import { Clone } from './Clone';
import { BrowseTab } from './BrowseTab';
import { InstalledTab } from './InstalledTab';

export function SkillsView() {
  const { cwd } = useWorkspaceStore();
  const [scope, setScope] = useState<SkillScope>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [installedRefreshKey, setInstalledRefreshKey] = useState(0);
  const [installedNames, setInstalledNames] = useState<Set<string>>(new Set());

  const refreshInstalled = useCallback(() => {
    setInstalledRefreshKey((k) => k + 1);
  }, []);

  // Keep installed names in sync so BrowseTab can show INSTALLED badge
  useEffect(() => {
    listCentralSkills(scope, cwd ?? undefined)
      .then((skills) => setInstalledNames(new Set(skills.map((s) => s.name))))
      .catch(() => {});
  }, [scope, cwd, installedRefreshKey]);


  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <Tabs defaultValue="browse" className="flex h-full min-h-0 w-full flex-col">
        {/* toolbar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="browse" className="h-8 gap-1.5">
              <Puzzle className="h-3.5 w-3.5" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="installed" className="h-8 gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Installed
            </TabsTrigger>
            <TabsTrigger value="repos" className="h-8 gap-1.5">
              <FolderGit2 className="h-3.5 w-3.5" />
              Repos
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {/* search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search skills…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-44 pl-8 text-xs bg-muted/30 border-none ring-offset-background focus-visible:ring-1"
              />
            </div>
            {/* scope toggle */}
            <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
              {(['user', 'project'] as const).map((s) => (
                <Button
                  key={s}
                  variant="ghost"
                  size="sm"
                  onClick={() => setScope(s)}
                  className={cn(
                    'h-7 px-3 text-[10px] uppercase tracking-wider',
                    scope === s
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  )}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <TabsContent value="browse" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
          <BrowseTab
            searchQuery={searchQuery}
            scope={scope}
            cwd={cwd}
            installedIds={installedNames}
            onInstalled={refreshInstalled}
          />
        </TabsContent>

        <TabsContent value="installed" className="mt-0 min-h-0 flex-1 overflow-y-auto pr-1">
          <InstalledTab
            searchQuery={searchQuery}
            scope={scope}
            cwd={cwd}
            refreshKey={installedRefreshKey}
          />
        </TabsContent>

        <TabsContent value="repos" className="mt-0 min-h-0 flex-1 overflow-y-auto">
          <Clone />
        </TabsContent>
      </Tabs>
    </div>
  );
}
