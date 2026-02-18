import { type ReactNode, useState, useEffect, useRef } from 'react';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { listen } from '@tauri-apps/api/event';
import { Button } from '@/components/ui/button';
import { Copy, Check, Send, FileText, GitBranch, Code, Loader2 } from 'lucide-react';
import { CodeEditor } from '../editor/CodeEditor';
import { DiffViewer } from '@/components/features/DiffViewer';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useInputStore } from '@/stores';
import { getErrorMessage } from '@/utils/errorUtils';
import { getFilename } from '@/utils/getFilename';
import {
  canonicalizePath,
  getGitFileDiff,
  readFile,
  readPdfContent,
  readXlsxContent,
  startWatchDirectory,
  stopWatchDirectory,
  writeFile,
} from '@/services';

interface FileViewerProps {
  filePath: string;
  addToNotepad?: (text: string, source?: string) => void;
  /** Optional element rendered at the far-left of the viewer header (e.g. a panel-expand button). */
  headerLeadingAction?: ReactNode;
}

interface GitDiff {
  original_content: string;
  current_content: string;
  has_changes: boolean;
}

export function FileViewer({ filePath, addToNotepad, headerLeadingAction }: FileViewerProps) {
  const [content, setContent] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [currentContent, setCurrentContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'code' | 'diff'>('code');
  const [gitDiff, setGitDiff] = useState<GitDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diskChanged, setDiskChanged] = useState(false);
  const prevWatchedDirRef = useRef<string | null>(null);
  const [canonicalFile, setCanonicalFile] = useState<string | null>(null);
  const { resolvedTheme } = useThemeContext();
  const { setInputValue } = useInputStore();

  const getFileExtension = (path: string) => {
    const base = getFilename(path);
    const lastDot = base.lastIndexOf('.');
    return lastDot > -1 ? base.substring(lastDot + 1).toLowerCase() : '';
  };

  const loadFile = async () => {
    setLoading(true);
    setError(null);
    setGitDiff(null);
    setViewMode('code');

    try {
      const extension = getFileExtension(filePath);
      let fileContent: string;

      switch (extension) {
        case 'pdf':
          fileContent = await readPdfContent(filePath);
          break;
        case 'xlsx':
          fileContent = await readXlsxContent(filePath);
          break;
        default:
          fileContent = await readFile(filePath);
          break;
      }

      setContent(fileContent);
      setCurrentContent(fileContent);
      setDiskChanged(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!filePath) {
      setContent('');
      setError(null);
      setGitDiff(null);
      setViewMode('code');
      return;
    }
    setFilename(getFilename(filePath));
    loadFile();
    (async () => {
      try {
        const c = await canonicalizePath(filePath);
        setCanonicalFile(c);
      } catch {
        setCanonicalFile(filePath);
      }
    })();
  }, [filePath]);

  useEffect(() => {
    setCurrentContent(content);
  }, [content]);

  const loadGitDiff = async () => {
    if (!filePath) return;

    setDiffLoading(true);
    try {
      const diff = await getGitFileDiff<GitDiff>(filePath);
      setGitDiff(diff);
    } catch (err) {
      console.error('Failed to load git diff:', err);
      setGitDiff(null);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleToggleViewMode = async () => {
    if (viewMode === 'code') {
      await loadGitDiff();
      setViewMode('diff');
    } else {
      setViewMode('code');
    }
  };

  const handleCopy = async () => {
    const textToCopy = selectedText || currentContent;
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy content:', err);
      }
    }
  };

  const handleSave = async (newContent: string) => {
    if (!filePath) return;

    try {
      await writeFile(filePath, newContent);
      setContent(newContent);
      setCurrentContent(newContent);
    } catch (err) {
      console.error('Failed to save file:', err);
      throw new Error(`Failed to save file: ${err}`);
    }
  };

  const handleSendToAI = () => {
    if (currentContent) {
      const textToAdd = selectedText || currentContent;

      // Set the text directly in chat input
      setInputValue(textToAdd);
    }
  };

  const handleAddToNote = () => {
    if (addToNotepad && currentContent) {
      const textToAdd = selectedText || currentContent;
      addToNotepad(textToAdd, `File: ${filename}`);
    }
  };

  const handleSelectionChange = (newSelectedText: string) => {
    setSelectedText(newSelectedText);
  };

  const handleContentChange = (newContent: string) => {
    setCurrentContent(newContent);
  };

  const handleToggleContent = () => {
    setShowFullContent(!showFullContent);
  };

  const MAX_LINES = 500;
  const isLargeFile = content.split('\n').length > MAX_LINES;

  const displayContent = showFullContent
    ? content
    : (() => {
        const lines = content.split('\n');
        if (lines.length <= MAX_LINES) return content;
        return lines.slice(0, MAX_LINES).join('\n');
      })();

  if (!filePath) return null;

  // Watch parent directory of the open file so we reliably get fs_change events
  useEffect(() => {
    const parentDir = filePath.includes('/')
      ? filePath.slice(0, filePath.lastIndexOf('/'))
      : filePath;
    const start = async () => {
      try {
        await startWatchDirectory(parentDir);
      } catch {}
    };
    const stopPrev = async () => {
      const prev = prevWatchedDirRef.current;
      if (prev && prev !== parentDir) {
        try {
          await stopWatchDirectory(prev);
        } catch {}
      }
    };
    start();
    stopPrev();
    prevWatchedDirRef.current = parentDir;
    return () => {
      (async () => {
        try {
          await stopWatchDirectory(parentDir);
        } catch {}
      })();
    };
  }, [filePath]);

  // Listen to fs_change to detect disk updates for the open file
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    const setup = async () => {
      unlisten = await listen<{ path: string; kind: string }>('fs_change', async (event) => {
        const changed = event.payload.path;
        if (!filePath) return;
        const target = canonicalFile || filePath;
        if (changed === target) {
          // If user hasn’t modified content, auto-reload; otherwise show a banner
          if (currentContent === content) {
            await loadFile();
          } else {
            setDiskChanged(true);
          }
        }
      });
    };
    setup();
    return () => {
      if (unlisten) unlisten();
    };
  }, [filePath, canonicalFile, content, currentContent]);

  return (
    <div
      className={`flex flex-col h-full border-l min-w-0 ${resolvedTheme === 'dark' ? 'border-border' : 'border-gray-200'}`}
    >
      <div
        className={`flex items-center justify-between p-2 border-b ${resolvedTheme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50'}`}
      >
        <div className="flex items-center gap-1 min-w-0">
          {/* Slot for a leading control injected by the parent (e.g. expand-tree button) */}
          {headerLeadingAction}
          <span className="text-sm font-medium truncate" title={filePath}>
            {filename}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {selectedText && (
            <span className={`text-xs mr-2 ${resolvedTheme === 'dark' ? 'text-primary' : 'text-blue-600'}`}>
              {selectedText.length} chars selected
            </span>
          )}
          {isLargeFile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleContent}
              className="p-1 h-auto text-xs"
              title={`${showFullContent ? 'Show first 500 lines' : 'Show all lines'} (${content.split('\n').length} total)`}
            >
              {showFullContent ? '500' : 'All'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleViewMode}
            disabled={diffLoading}
            className="p-1 h-auto"
            title={viewMode === 'code' ? 'Show git diff' : 'Show code view'}
          >
            {diffLoading ? (
              <div className="w-4 h-4 animate-spin border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
            ) : viewMode === 'code' ? (
              <GitBranch className="w-4 h-4" />
            ) : (
              <Code className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSendToAI}
            disabled={!content || loading}
            className="p-1 h-auto"
            title={selectedText ? 'Send selected text to AI' : 'Send file content to AI'}
          >
            <Send className="w-4 h-4" />
          </Button>
          {addToNotepad && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddToNote}
              disabled={!content || loading}
              className="p-1 h-auto"
              title={selectedText ? 'Add selected text to note' : 'Add file content to note'}
            >
              <FileText className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!content || loading}
            className="p-1 h-auto"
            title={selectedText ? 'Copy selected text' : 'Copy file content'}
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {diskChanged && (
          <div
            className={`px-3 py-2 text-xs flex items-center justify-between ${resolvedTheme === 'dark' ? 'bg-amber-950 text-amber-300' : 'bg-amber-50 text-amber-800'}`}
          >
            <span>File changed on disk.</span>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2"
                onClick={() => setDiskChanged(false)}
              >
                Dismiss
              </Button>
              <Button variant="default" size="sm" className="h-6 px-2" onClick={loadFile}>
                Reload
              </Button>
            </div>
          </div>
        )}
        {loading ? (
          <div
            className={`h-full p-6 flex flex-col items-center justify-center gap-4 ${resolvedTheme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}
          >
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading file...</span>
            </div>
            <div className="w-full max-w-xl space-y-2">
              <div
                className={`h-3 rounded animate-pulse ${resolvedTheme === 'dark' ? 'bg-muted' : 'bg-gray-200'}`}
              />
              <div
                className={`h-3 rounded animate-pulse ${resolvedTheme === 'dark' ? 'bg-muted' : 'bg-gray-200'}`}
              />
              <div
                className={`h-3 rounded w-2/3 animate-pulse ${resolvedTheme === 'dark' ? 'bg-muted' : 'bg-gray-200'}`}
              />
            </div>
          </div>
        ) : error ? (
          <div
            className={`p-4 text-center ${resolvedTheme === 'dark' ? 'text-destructive' : 'text-red-500'}`}
          >
            {error}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {viewMode === 'diff' && gitDiff ? (
              gitDiff.has_changes ? (
                <div className="flex-1 min-h-0">
                  <DiffViewer
                    original={gitDiff.original_content}
                    current={gitDiff.current_content}
                  />
                </div>
              ) : (
                <div
                  className={`p-8 text-center ${resolvedTheme === 'dark' ? 'text-muted-foreground' : 'text-gray-500'}`}
                >
                  <GitBranch
                    className={`w-12 h-12 mx-auto mb-4 ${resolvedTheme === 'dark' ? 'text-muted-foreground/50' : 'text-gray-300'}`}
                  />
                  <p className="text-lg font-medium mb-2">No changes detected</p>
                  <p className="text-sm">This file is identical to the version in git HEAD</p>
                </div>
              )
            ) : (
              <>
                <CodeEditor
                  content={displayContent}
                  filePath={filePath}
                  onContentChange={handleContentChange}
                  onSave={handleSave}
                  onSelectionChange={handleSelectionChange}
                  onSendToAI={(text) => {
                    setInputValue(text);
                  }}
                  onAddToNote={(text) => {
                    if (addToNotepad) {
                      addToNotepad(text, `File: ${filename}`);
                    }
                  }}
                  className="flex-1"
                />
                {isLargeFile && !showFullContent && (
                  <div
                    className={`p-4 text-center border-t ${resolvedTheme === 'dark' ? 'border-border bg-card' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <p
                      className={`text-sm mb-2 ${resolvedTheme === 'dark' ? 'text-muted-foreground' : 'text-gray-600'}`}
                    >
                      Showing first {MAX_LINES} lines of {content.split('\n').length} total lines
                    </p>
                    <Button variant="outline" size="sm" onClick={handleToggleContent}>
                      Show All Lines
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
