import { useEffect, useMemo, useRef, useState } from 'react';
import * as Diff from 'diff';
import { Check, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getDiffCounts, normalizeUnifiedDiff } from '@/utils/diff';

interface DiffViewerProps {
  original?: string;
  current?: string;
  unifiedDiff?: string;
  displayPath?: string;
  defaultCollapsed?: boolean;
  className?: string;
}

interface DiffLine {
  type: 'add' | 'remove' | 'normal';
  content: string;
  lineNumber: {
    old?: number;
    new?: number;
  };
}

const shouldSkipUnifiedLine = (line: string) =>
  /^\s*(new file|deleted file)\b/i.test(line) ||
  /^\s*mode \d+/i.test(line) ||
  /^\s*(new mode|old mode)\b/i.test(line) ||
  /^\s*similarity index\b/i.test(line) ||
  /^\s*rename (from|to)\b/i.test(line);

export function DiffViewer({
  original = '',
  current = '',
  unifiedDiff,
  displayPath,
  defaultCollapsed = true,
  className,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'old' | 'new' | 'diff'>('diff');
  const viewModes: Array<'old' | 'new' | 'diff'> = ['old', 'new', 'diff'];
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  const normalizedUnified = useMemo(() => normalizeUnifiedDiff(unifiedDiff), [unifiedDiff]);

  // If unifiedDiff is provided, approximate split to left/right
  const { left, right } = useMemo(() => {
    if (!normalizedUnified) return { left: original, right: current };
    const lines = normalizedUnified.split('\n');
    const orig: string[] = [];
    const curr: string[] = [];
    for (const line of lines) {
      const skipLine = shouldSkipUnifiedLine(line);
      if (
        skipLine ||
        line.startsWith('--- ') ||
        line.startsWith('+++ ') ||
        line.startsWith('@@') ||
        line.startsWith('diff --git') ||
        line.startsWith('index ')
      )
        continue;
      if (line.startsWith('+')) {
        curr.push(line.slice(1));
        continue;
      }
      if (line.startsWith('-')) {
        orig.push(line.slice(1));
        continue;
      }
      const ctx = line.startsWith(' ') ? line.slice(1) : line;
      orig.push(ctx);
      curr.push(ctx);
    }
    return { left: orig.join('\n'), right: curr.join('\n') };
  }, [normalizedUnified, original, current]);

  const unifiedPath = useMemo(() => {
    if (!normalizedUnified) return '';
    const lines = normalizedUnified.split('\n');
    const diffGit = lines.find((line) => line.startsWith('diff --git '));
    if (diffGit) {
      const match = diffGit.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (match) {
        const preferred = match[2] !== '/dev/null' ? match[2] : match[1];
        return preferred.replace(/^([ab])\//, '');
      }
    }

    const plusLine = lines.find((line) => line.startsWith('+++ '));
    const minusLine = lines.find((line) => line.startsWith('--- '));
    const clean = (line?: string) =>
      line ? line.replace(/^(\+\+\+|---)\s+/, '').replace(/^([ab])\//, '') : '';

    const plusPath = clean(plusLine);
    const minusPath = clean(minusLine);
    if (plusPath && plusPath !== '/dev/null') return plusPath;
    if (minusPath && minusPath !== '/dev/null') return minusPath;
    return '';
  }, [normalizedUnified]);

  const diffLines = useMemo(() => {
    const changes = Diff.diffLines(left, right);
    const result: DiffLine[] = [];
    let oldLineNum = 1;
    let newLineNum = 1;

    changes.forEach((change: Diff.Change) => {
      const lines = change.value.split('\n');
      // Remove last empty line if it exists
      if (lines[lines.length - 1] === '') {
        lines.pop();
      }

      lines.forEach((line) => {
        if (change.added) {
          result.push({
            type: 'add',
            content: line,
            lineNumber: { new: newLineNum++ },
          });
        } else if (change.removed) {
          result.push({
            type: 'remove',
            content: line,
            lineNumber: { old: oldLineNum++ },
          });
        } else {
          result.push({
            type: 'normal',
            content: line,
            lineNumber: { old: oldLineNum++, new: newLineNum++ },
          });
        }
      });
    });

    return result;
  }, [left, right]);

  const { addedCount, removedCount } = useMemo(
    () => getDiffCounts({ unifiedDiff, normalizedUnified, diffLines }),
    [diffLines, normalizedUnified, unifiedDiff]
  );

  const diffText = useMemo(() => {
    if (normalizedUnified) return normalizedUnified;
    return diffLines
      .map((line) => {
        const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
        return `${prefix}${line.content}`;
      })
      .join('\n');
  }, [diffLines, normalizedUnified]);

  const contentToCopy = viewMode === 'old' ? left : viewMode === 'new' ? right : diffText;

  const handleCopy = async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={cn(
        'diff-viewer flex flex-col h-full overflow-auto bg-white dark:bg-gray-900',
        className
      )}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200/70 bg-gray-50/70 px-3 py-2 dark:border-gray-800/70 dark:bg-gray-900/60">
        <div className="flex items-center gap-3 min-w-0">
          {displayPath || unifiedPath ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                {displayPath || unifiedPath}
              </span>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="text-green-600 dark:text-green-400">+{addedCount}</span>
                <span className="text-red-600 dark:text-red-400">-{removedCount}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-green-600 dark:text-green-400">+{addedCount}</span>
              <span className="text-red-600 dark:text-red-400">-{removedCount}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white text-sm shadow-sm dark:border-gray-700 dark:bg-gray-950">
            {viewModes.map((mode) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(mode)}
                className={`rounded-none px-3 ${
                  viewMode === mode
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {mode}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            aria-label="Copy content"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed((prev) => !prev)}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            aria-label={collapsed ? 'Expand diff' : 'Collapse diff'}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="diff-content flex-1 font-mono text-sm">
          {viewMode === 'diff' ? (
            <table className="w-full table-fixed">
              <tbody>
                {diffLines.map((line, index) => (
                  <tr
                    key={index}
                    className={`leading-relaxed hover:bg-gray-50/50 dark:hover:bg-gray-800/50 ${
                      line.type === 'add'
                        ? 'bg-green-50/30 dark:bg-green-900/20'
                        : line.type === 'remove'
                          ? 'bg-red-50/30 dark:bg-red-900/20'
                          : ''
                    }`}
                  >
                    {/* Change indicator */}
                    <td
                      className={`w-6 min-w-6 text-center border-r border-gray-200 dark:border-gray-700 select-none text-sm font-medium py-1 ${
                        line.type === 'add'
                          ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300'
                          : line.type === 'remove'
                            ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ''}
                    </td>

                    {/* Content */}
                    <td
                      className={`whitespace-pre text-sm text-gray-900 dark:text-gray-100 ${
                        line.type === 'add'
                          ? 'bg-green-50/80 dark:bg-green-900/30'
                          : line.type === 'remove'
                            ? 'bg-red-50/80 dark:bg-red-900/30'
                            : 'bg-white dark:bg-gray-900'
                      }`}
                    >
                      {line.content}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre className="whitespace-pre text-gray-900 dark:text-gray-100 px-4 py-3 leading-relaxed">
              {viewMode === 'old' ? left : right}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
