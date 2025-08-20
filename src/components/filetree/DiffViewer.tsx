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
    <div className="diff-viewer flex flex-col h-full bg-white">
      {fileName && (
        <div className="diff-header bg-gray-50 border-b p-2 text-sm font-medium flex-shrink-0">
          {fileName}
        </div>
      )}
      
      <div className="diff-content flex-1 overflow-auto font-mono text-sm">
        <table className="w-full table-fixed">
          <tbody>
            {diffLines.map((line, index) => (
              <tr key={index} className={`leading-relaxed hover:bg-gray-50/50 ${
                line.type === 'add' ? 'bg-green-50/30' : 
                line.type === 'remove' ? 'bg-red-50/30' : ''
              }`}>
                {/* Old line number */}
                <td className={`w-16 min-w-16 text-right px-2 py-1 border-r border-gray-200 select-none text-xs ${
                  line.type === 'add' ? 'bg-green-50 text-gray-400' : 
                  line.type === 'remove' ? 'bg-red-50 text-gray-600' : 'bg-gray-50 text-gray-600'
                }`}>
                  {line.lineNumber.old || ''}
                </td>
                
                {/* New line number */}
                <td className={`w-16 min-w-16 text-right px-2 py-1 border-r border-gray-200 select-none text-xs ${
                  line.type === 'add' ? 'bg-green-50 text-gray-600' : 
                  line.type === 'remove' ? 'bg-red-50 text-gray-400' : 'bg-gray-50 text-gray-600'
                }`}>
                  {line.lineNumber.new || ''}
                </td>
                
                {/* Change indicator */}
                <td className={`w-6 min-w-6 text-center border-r border-gray-200 select-none text-sm font-medium py-1 ${
                  line.type === 'add' ? 'bg-green-100 text-green-700' : 
                  line.type === 'remove' ? 'bg-red-100 text-red-700' : 'bg-gray-50 text-gray-400'
                }`}>
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ''}
                </td>
                
                {/* Content */}
                <td className={`px-4 py-1 whitespace-pre text-sm ${
                  line.type === 'add' ? 'bg-green-50/80' : 
                  line.type === 'remove' ? 'bg-red-50/80' : 'bg-white'
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