export type DiffCountLine = {
  type: 'add' | 'remove' | 'normal';
};

type GetDiffCountsInput = {
  unifiedDiff?: string;
  normalizedUnified?: string;
  diffLines?: DiffCountLine[];
};

type DiffCounts = {
  addedCount: number;
  removedCount: number;
};

export function getDiffCounts({
  unifiedDiff,
  normalizedUnified,
  diffLines,
}: GetDiffCountsInput): DiffCounts {
  const resolvedUnified = normalizedUnified || normalizeUnifiedDiff(unifiedDiff);

  if (resolvedUnified) {
    let added = 0;
    let removed = 0;
    const lines = resolvedUnified.split('\n');
    for (const line of lines) {
      if (shouldSkipUnifiedCountLine(line)) continue;
      if (line.startsWith('+')) {
        added += 1;
        continue;
      }
      if (line.startsWith('-')) removed += 1;
    }
    return { addedCount: added, removedCount: removed };
  }

  let added = 0;
  let removed = 0;
  for (const line of diffLines ?? []) {
    if (line.type === 'add') added += 1;
    if (line.type === 'remove') removed += 1;
  }
  return { addedCount: added, removedCount: removed };
}

export function normalizeUnifiedDiff(value?: string): string {
  if (!value) return '';
  return value.replace(/^```diff\n?|```$/g, '');
}

const shouldSkipUnifiedCountLine = (line: string) =>
  line === '\\ No newline at end of file' ||
  line.startsWith('diff --git') ||
  line.startsWith('index ') ||
  line.startsWith('@@') ||
  line.startsWith('+++ ') ||
  line.startsWith('--- ') ||
  /^\s*(new file|deleted file)\b/i.test(line) ||
  /^\s*mode \d+/i.test(line) ||
  /^\s*(new mode|old mode)\b/i.test(line) ||
  /^\s*similarity index\b/i.test(line) ||
  /^\s*rename (from|to)\b/i.test(line);
