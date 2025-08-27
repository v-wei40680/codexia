import React from 'react';
import { Badge } from '../ui/badge';
import { AtSign, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface FileReference {
  path: string;
  relativePath: string;
  name: string;
  isDirectory: boolean;
}

interface FileReferenceListProps {
  fileReferences: FileReference[];
  onRemove: (path: string) => void;
}

export const FileReferenceList: React.FC<FileReferenceListProps> = ({
  fileReferences,
  onRemove,
}) => {
  if (fileReferences.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <AtSign className="w-3 h-3 text-gray-400 flex-shrink-0" />
      {fileReferences.map((ref) => (
        <TooltipProvider key={ref.path}>
          <Tooltip>
            <TooltipTrigger>
              <Badge
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-200 h-5 text-xs px-1.5 py-0"
              >
                <span>{ref.name}</span>
                <button
                  className="ml-1 p-0.5 hover:bg-gray-300 rounded flex-shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(ref.path);
                  }}
                  type="button"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{ref.relativePath}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};