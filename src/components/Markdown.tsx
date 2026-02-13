import { memo, useMemo } from 'react';
import type { AnchorHTMLAttributes } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useLayoutStore } from '@/stores';

interface MarkdownProps {
  value: string;
  className?: string;
  inline?: boolean;
}

const WINDOWS_DRIVE_PATTERN = /^[a-z]:[\\/]/i;

function isAbsolutePath(path: string) {
  return (
    path.startsWith('/') ||
    path.startsWith('\\') ||
    path.startsWith('\\\\') ||
    WINDOWS_DRIVE_PATTERN.test(path)
  );
}

function normalizeFileLinkPath(path: string, cwd: string) {
  if (!path) {
    return path;
  }
  if (isAbsolutePath(path) || !cwd) {
    return path;
  }

  const separator = cwd.includes('\\') && !cwd.includes('/') ? '\\' : '/';
  const cleanCwd = cwd.replace(/[\\/]+$/, '');
  const cleanPath = path.replace(/^[.][/\\]/, '').replace(/^[\\/]+/, '');
  return `${cleanCwd}${separator}${cleanPath}`;
}

export const Markdown = memo<MarkdownProps>(({ value, className = '', inline = false }) => {
  const { resolvedTheme } = useThemeContext();
  const { cwd, setSelectedFilePath } = useWorkspaceStore();
  const { setActiveRightPanelTab, setRightPanelOpen } = useLayoutStore();

  const components = useMemo(
    () => ({
      a: ({
        href,
        onClick,
        className,
        children,
        ...rest
      }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
        const normalizedHref = typeof href === 'string' ? href.trim() : '';
        const hrefLower = normalizedHref.toLowerCase();
        const isExternal =
          hrefLower.startsWith('http://') ||
          hrefLower.startsWith('https://') ||
          hrefLower.startsWith('mailto:') ||
          hrefLower.startsWith('#');
        const hrefPath = normalizedHref.split(/[?#]/, 1)[0];
        const isFileProtocol = hrefLower.startsWith('file://');
        const isInternalFileLink = !isExternal || isFileProtocol;
        return (
          <a
            href={href}
            className={cn(
              className,
              (isExternal || isInternalFileLink) &&
                'text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300'
            )}
            title={normalizedHref || undefined}
            onClick={async (event) => {
              if (isInternalFileLink && normalizedHref) {
                event.preventDefault();
                event.stopPropagation();
                let candidatePath = hrefPath;

                if (isFileProtocol) {
                  candidatePath = decodeURIComponent(hrefPath.replace(/^file:\/\//i, ''));
                }

                const resolvedPath = normalizeFileLinkPath(candidatePath, cwd);
                setSelectedFilePath(resolvedPath);
                setRightPanelOpen(true);
                setActiveRightPanelTab('files');
                return;
              }
              onClick?.(event);
            }}
            {...rest}
          >
            {children}
          </a>
        );
      },
    }),
    [cwd, setActiveRightPanelTab, setRightPanelOpen, setSelectedFilePath]
  );

  return (
    <div
      className={cn(
        'text-sm text-foreground leading-relaxed prose prose-sm max-w-full overflow-auto break-words select-text',
        resolvedTheme === 'dark' && 'prose-invert',
        inline && 'inline align-baseline [&_p]:inline [&_p]:m-0',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {value}
      </ReactMarkdown>
    </div>
  );
});
