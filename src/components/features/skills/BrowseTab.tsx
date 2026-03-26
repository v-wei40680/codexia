import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  type MarketSkillItem,
  type SkillScope,
  fetchMarketLeaderboard,
  installFromMarket,
  searchMarketSkills,
} from '@/services';
import {
  CheckCircle,
  Download,
  Loader2,
  SearchX,
  TrendingUp,
  Flame,
  Clock,
  Plus,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores';
import { type BoardType, leaderboardCache, searchCache } from './browseCache';

const BOARD_TABS: { value: BoardType; label: string; icon: React.ReactNode }[] = [
  { value: 'alltime', label: 'All Time', icon: <Clock className="h-3 w-3" /> },
  { value: 'trending', label: 'Trending', icon: <TrendingUp className="h-3 w-3" /> },
  { value: 'hot', label: 'Hot', icon: <Flame className="h-3 w-3" /> },
];

export type { BoardType };

export function BrowseTab({
  searchQuery,
  scope,
  installedIds,
  onInstalled,
}: {
  searchQuery: string;
  scope: SkillScope;
  installedIds: Set<string>;
  onInstalled: () => void;
}) {
  const { cwd } = useWorkspaceStore();
  const [board, setBoard] = useState<BoardType>('alltime');
  const [skills, setSkills] = useState<MarketSkillItem[]>(() => leaderboardCache['alltime'] ?? []);
  const [loading, setLoading] = useState(!leaderboardCache['alltime']);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLeaderboard = useCallback(async (b: BoardType) => {
    if (leaderboardCache[b]) {
      setSkills(leaderboardCache[b]!);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMarketLeaderboard(b);
      leaderboardCache[b] = data;
      setSkills(data);
    } catch (err) {
      toast.error('Failed to load marketplace', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Leaderboard on mount and board change (when no search query)
  useEffect(() => {
    if (!searchQuery) void loadLeaderboard(board);
  }, [board, loadLeaderboard, searchQuery]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const cached = searchCache.get(searchQuery);
      if (cached) {
        setSkills(cached);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await searchMarketSkills(searchQuery, 40);
        searchCache.set(searchQuery, data);
        setSkills(data);
      } catch (err) {
        toast.error('Search failed', {
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleInstall = async (skill: MarketSkillItem) => {
    if (installingId) return;
    setInstallingId(skill.id);
    try {
      await installFromMarket(skill.source, skill.skillId, scope, cwd ?? undefined);
      onInstalled();
      toast.success(`Installed ${skill.name}`);
    } catch (err) {
      toast.error(`Failed to install ${skill.name}`, {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* board tabs (hidden when searching) */}
      {!searchQuery && (
        <div className="flex gap-1">
          {BOARD_TABS.map((t) => (
            <Button
              key={t.value}
              variant="ghost"
              size="sm"
              onClick={() => setBoard(t.value)}
              className={cn(
                'h-7 gap-1.5 px-3 text-xs',
                board === t.value
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.icon}
              {t.label}
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="mt-3 text-sm">{searchQuery ? 'Searching…' : 'Loading…'}</p>
        </div>
      ) : skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <SearchX className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold">
            {searchQuery ? `No results for "${searchQuery}"` : 'No skills found'}
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
          {skills.map((skill) => {
            const installed = installedIds.has(skill.name);
            return (
              <div
                key={skill.id}
                className="group flex flex-col justify-between gap-3 rounded-lg border border-muted/60 bg-card/50 p-4 transition-all hover:border-primary/30 hover:shadow-md hover:bg-card"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-muted/50 p-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary shrink-0">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="truncate text-sm font-bold tracking-tight">{skill.name}</span>
                      {installed ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Installed
                        </span>
                      ) : (
                        <Button
                          size="icon"
                          variant="default"
                          className="h-7 w-7 shrink-0"
                          disabled={Boolean(installingId)}
                          onClick={() => handleInstall(skill)}
                        >
                          {installingId === skill.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono opacity-60 truncate">
                      {skill.source}
                    </p>
                    {skill.installs > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                        <Download className="h-3 w-3" />
                        <span>{skill.installs.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
