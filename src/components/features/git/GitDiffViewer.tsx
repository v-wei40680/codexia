import { createTwoFilesPatch } from 'diff';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DiffModeEnum, DiffView } from '@git-diff-view/react';
import { ChevronDown, ChevronUp, Columns2, Minus, Plus, Send, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GitFileDiffMetaResponse, GitFileDiffResponse } from '@/services/tauri';
import { useInputStore } from '@/stores';
import type { DiffSection, DiffSource } from './types';
import { formatBytes } from './utils';

interface GitDiffViewerProps {
  selectedDiffPath: string | null;
  selectedDiffSection: DiffSection;
  diffSource: DiffSource;
  diffViewCollapsed: boolean;
  wordWrapEnabled: boolean;
  diffMetaLoading: boolean;
  diffLoading: boolean;
  requiresLargeDiffConfirmation: boolean;
  diffMeta: GitFileDiffMetaResponse | null;
  diffData: GitFileDiffResponse | null;
  currentDiffKey: string | null;
  onToggleDiffViewCollapsed: () => void;
  onConfirmLargeDiffLoad: (key: string) => void;
  onRevertFile: () => void;
  onStageUnstageCurrentFile: () => void;
  revertLoading: boolean;
}

function buildDiffHunks(selectedDiffPath: string | null, diffData: GitFileDiffResponse | null): string[] {
  if (!diffData || !selectedDiffPath) return [];
  const oldPath = `a/${selectedDiffPath}`;
  const newPath = `b/${selectedDiffPath}`;
  const rawPatch = createTwoFilesPatch(
    oldPath,
    newPath,
    diffData.old_content ?? '',
    diffData.new_content ?? '',
    '',
    '',
    { context: 3 }
  );
  const normalizedBody = rawPatch
    .split('\n')
    .filter((line) => !line.startsWith('Index: ') && !line.startsWith('===='))
    .join('\n');
  return [`diff --git ${oldPath} ${newPath}\n${normalizedBody}`];
}

export function GitDiffViewer({
  selectedDiffPath,
  selectedDiffSection,
  diffSource,
  diffViewCollapsed,
  wordWrapEnabled,
  diffMetaLoading,
  diffLoading,
  requiresLargeDiffConfirmation,
  diffMeta,
  diffData,
  currentDiffKey,
  onToggleDiffViewCollapsed,
  onConfirmLargeDiffLoad,
  onRevertFile,
  onStageUnstageCurrentFile,
  revertLoading,
}: GitDiffViewerProps) {
  const [splitModeEnabled, setSplitModeEnabled] = useState(false);
  const [selection, setSelection] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);
  const diffContainerRef = useRef<HTMLDivElement | null>(null);
  const { setInputValue } = useInputStore();
  const diffHunks = useMemo(
    () => buildDiffHunks(selectedDiffPath, diffData),
    [selectedDiffPath, diffData]
  );
  const renderedDiffView = useMemo(() => {
    if (!selectedDiffPath || !diffData || !diffData.has_changes || diffHunks.length === 0) {
      return null;
    }
    return (
      <div className="git-diff-compact-num">
        <DiffView
          className="git-diff-table"
          data={{
            oldFile: {
              fileName: `a/${selectedDiffPath}`,
              content: diffData.old_content ?? '',
            },
            newFile: {
              fileName: `b/${selectedDiffPath}`,
              content: diffData.new_content ?? '',
            },
            hunks: diffHunks,
          }}
          diffViewMode={splitModeEnabled ? DiffModeEnum.Split : DiffModeEnum.Unified}
          diffViewTheme="dark"
          diffViewHighlight={false}
          diffViewWrap={wordWrapEnabled}
        />
      </div>
    );
  }, [selectedDiffPath, diffData, diffHunks, splitModeEnabled, wordWrapEnabled]);

  useEffect(() => {
    setSelection(null);
  }, [selectedDiffPath, selectedDiffSection, diffViewCollapsed, splitModeEnabled]);

  const captureSelectionOnce = () => {
    console.log('[GitDiffViewer] captureSelectionOnce triggered');
    const browserSelection = window.getSelection();
    const container = diffContainerRef.current;
    if (!browserSelection || browserSelection.rangeCount === 0 || !container) {
      console.log('[GitDiffViewer] no selection range or container missing', {
        hasSelection: Boolean(browserSelection),
        rangeCount: browserSelection?.rangeCount ?? 0,
        hasContainer: Boolean(container),
      });
      setSelection(null);
      return;
    }

    const range = browserSelection.getRangeAt(0);
    const commonNode =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;

    if (!commonNode || !container.contains(commonNode)) {
      console.log('[GitDiffViewer] selection is outside diff container');
      setSelection(null);
      return;
    }

    const text = browserSelection.toString();
    if (!text.trim()) {
      console.log('[GitDiffViewer] selection text is empty');
      setSelection(null);
      return;
    }

    const rangeRect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const x = rangeRect.left - containerRect.left + rangeRect.width / 2;
    const y = rangeRect.top - containerRect.top - 40;
    const maxX = containerRect.width - 80;
    const maxY = containerRect.height - 36;
    console.log('[GitDiffViewer] selection captured', {
      textLength: text.length,
      x,
      y,
    });

    setSelection({
      text,
      position: {
        x: Math.min(Math.max(10, x), maxX),
        y: Math.max(10, Math.min(y, maxY)),
      },
    });
  };

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col">
      {selectedDiffPath && (
        <div className="px-3 border-b border-white/10 flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground truncate flex-1" title={selectedDiffPath}>
            {selectedDiffPath}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onRevertFile}
              disabled={!selectedDiffPath || revertLoading}
              title="Revert file changes"
            >
              <Undo2 className="h-3.5 w-3.5 mr-1" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onStageUnstageCurrentFile}
              disabled={!selectedDiffPath}
              title={selectedDiffSection === 'staged' ? 'Unstage file' : 'Stage file'}
            >
              {selectedDiffSection === 'staged' ? (
                <Minus className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1" />
              )}
            </Button>
            <Button
              variant={splitModeEnabled ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSplitModeEnabled((value) => !value)}
              aria-label={splitModeEnabled ? 'Switch to unified mode' : 'Switch to split mode'}
              title={splitModeEnabled ? 'Switch to unified mode' : 'Switch to split mode'}
              className="p-1 h-auto"
            >
              <Columns2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleDiffViewCollapsed}
              title={diffViewCollapsed ? 'Expand diff view' : 'Collapse diff view'}
            >
              {diffViewCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {!diffViewCollapsed && (
        <div
          ref={diffContainerRef}
          className="flex-1 min-h-0 overflow-auto relative selection:bg-blue-500/35 selection:text-foreground"
          onMouseUp={captureSelectionOnce}
          onKeyUp={captureSelectionOnce}
        >
          {selection?.text.trim() && (
            <div
              data-floating-selection-toolbar
              className="absolute z-20 flex items-center gap-1 p-1 rounded shadow-lg border bg-card border-border"
              style={{
                left: selection.position.x,
                top: selection.position.y,
                transform: 'translateX(-50%)',
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  console.log('[GitDiffViewer] send selected text', {
                    textLength: selection.text.length,
                  });
                  setInputValue(selection.text);
                  setSelection(null);
                }}
                className="p-1 h-auto"
                title="Send selected text to AI"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
          <div>
            {!selectedDiffPath && (
              <div className="text-sm text-muted-foreground">Select a file to preview diff</div>
            )}
            {diffSource === 'latest-turn' && (
              <div className="mb-3 rounded border border-dashed border-border p-2 text-xs text-muted-foreground">
                Latest turn changes view is not available yet. Showing uncommitted file set.
              </div>
            )}
            {selectedDiffPath && diffMetaLoading && (
              <div className="text-sm text-muted-foreground">Preparing diff...</div>
            )}
            {selectedDiffPath && !diffMetaLoading && requiresLargeDiffConfirmation && diffMeta && (
              <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <div className="text-amber-200">
                  Large diff detected ({formatBytes(diffMeta.total_bytes)}). Load diff manually?
                </div>
                <div className="mt-1 text-xs text-amber-200/80">
                  Before: {formatBytes(diffMeta.old_bytes)} • After: {formatBytes(diffMeta.new_bytes)}
                </div>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    if (!currentDiffKey) return;
                    onConfirmLargeDiffLoad(currentDiffKey);
                  }}
                >
                  Load diff
                </Button>
              </div>
            )}
            {selectedDiffPath && diffLoading && (
              <div className="text-sm text-muted-foreground">Loading diff...</div>
            )}
            {selectedDiffPath &&
              !diffMetaLoading &&
              !requiresLargeDiffConfirmation &&
              !diffLoading &&
              diffData &&
              !diffData.has_changes && <div className="text-sm text-muted-foreground">No changes</div>}
            {selectedDiffPath &&
              !diffMetaLoading &&
              !requiresLargeDiffConfirmation &&
              !diffLoading &&
              diffData &&
              diffData.has_changes &&
              diffHunks.length > 0 &&
              renderedDiffView}
          </div>
        </div>
      )}
    </div>
  );
}
