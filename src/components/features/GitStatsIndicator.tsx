import { Minus, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useGitStatsStore } from '@/stores/useGitStatsStore';

export function GitStatsIndicator() {
  const { stats } = useGitStatsStore();

  if (!stats) return null;

  const totalFiles = stats.stagedFiles + stats.unstagedFiles;

  if (totalFiles === 0) return null;

  return (
    <div className="flex items-center text-xs">
      <Badge
        variant="outline"
        className="gap-1 border-transparent bg-transparent px-0 py-0 font-mono tabular-nums"
      >
        <span className="flex items-center gap-0.5 text-emerald-400">
          <Plus className="h-3 w-3" />
          <AnimatedCount value={stats.totalAdditions} />
        </span>
        <span className="flex items-center gap-0.5 text-red-400">
          <Minus className="h-3 w-3" />
          <AnimatedCount value={stats.totalDeletions} />
        </span>
      </Badge>
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full bg-muted-foreground transition-opacity',
          stats.isLoading ? 'opacity-80 animate-pulse' : 'opacity-0'
        )}
        aria-hidden
      />
    </div>
  );
}

function AnimatedCount({ value }: { value: number }) {
  return (
    <span className="inline-grid min-w-[1ch]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
