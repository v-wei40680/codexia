import { useMemo } from "react";
import * as Diff from "diff";

interface DiffViewerProps {
  original: string;
  current: string;
  fileName?: string;
}

interface DiffLine {
  type: 'add' | 'remove' | 'normal';
  content: string;
  lineNumber: {
    old?: number;
    new?: number;
  };
}

export function DiffViewer({ original, current, fileName }: DiffViewerProps) {
  const diffLines = useMemo(() => {
    const changes = Diff.diffLines(original, current);
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
            lineNumber: { new: newLineNum++ }
          });
        } else if (change.removed) {
          result.push({
            type: 'remove',
            content: line,
            lineNumber: { old: oldLineNum++ }
          });
        } else {
          result.push({
            type: 'normal',
            content: line,
            lineNumber: { old: oldLineNum++, new: newLineNum++ }
          });
        }
      });
    });

    return result;
  }, [original, current]);

  return (
    <div className="diff-viewer flex flex-col h-full bg-white dark:bg-gray-900">
      {fileName && (
        <div className="diff-header bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 text-sm font-medium flex-shrink-0 text-gray-900 dark:text-gray-100">
          {fileName}
        </div>
      )}
      
      <div className="diff-content flex-1 overflow-auto font-mono text-sm">
        <table className="w-full table-fixed">
          <tbody>
            {diffLines.map((line, index) => (
              <tr key={index} className={`leading-relaxed hover:bg-gray-50/50 dark:hover:bg-gray-800/50 ${
                line.type === 'add' ? 'bg-green-50/30 dark:bg-green-900/20' : 
                line.type === 'remove' ? 'bg-red-50/30 dark:bg-red-900/20' : ''
              }`}>
                {/* Change indicator */}
                <td className={`w-6 min-w-6 text-center border-r border-gray-200 dark:border-gray-700 select-none text-sm font-medium py-1 ${
                  line.type === 'add' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300' : 
                  line.type === 'remove' ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}>
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ''}
                </td>
                
                {/* Content */}
                <td className={`px-4 py-1 whitespace-pre text-sm text-gray-900 dark:text-gray-100 ${
                  line.type === 'add' ? 'bg-green-50/80 dark:bg-green-900/30' : 
                  line.type === 'remove' ? 'bg-red-50/80 dark:bg-red-900/30' : 'bg-white dark:bg-gray-900'
                }`}>
                  {line.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}