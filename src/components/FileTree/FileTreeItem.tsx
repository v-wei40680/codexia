import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  FolderCheck,
} from "lucide-react";
import { getFileIcon } from "./fileIcons";
import { SubFolderContent } from "./SubFolderContent";
import { useChatInputStore } from "@/stores/chatInputStore";
import { useFolderStore } from "@/stores/FolderStore";

interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  extension?: string;
}

interface FileTreeItemProps {
  entry: FileEntry;
  level?: number;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onAddToChat: (path: string) => void;
  onFileClick: (path: string, isDirectory: boolean) => void;
  onSetWorkingFolder: (path: string) => void;
  onCalculateTokens: (path: string) => Promise<number | null>;
  isFiltered: (entry: FileEntry) => boolean;
}

export function FileTreeItem({
  entry,
  level = 0,
  expandedFolders,
  onToggleFolder,
  onAddToChat,
  onFileClick,
  onSetWorkingFolder,
  onCalculateTokens,
  isFiltered,
}: FileTreeItemProps) {
  const [tokens, setTokens] = useState<number | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);
  
  const { addFileReference, replaceFileReferences } = useChatInputStore();
  const { currentFolder } = useFolderStore();

  const getRelativePath = (fullPath: string): string => {
    if (!currentFolder) return fullPath;
    
    // Remove current folder path to get relative path
    if (fullPath.startsWith(currentFolder)) {
      const relativePath = fullPath.slice(currentFolder.length);
      return relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    }
    return fullPath;
  };

  const handleAddToChatInput = () => {
    const relativePath = getRelativePath(entry.path);
    addFileReference(entry.path, relativePath, entry.name, entry.is_directory);
    if (onAddToChat) {
      onAddToChat(entry.path);
    }
  };

  const handleFileClickWithInput = () => {
    if (entry.is_directory) {
      onToggleFolder(entry.path);
    } else {
      // Replace current file references with this single file
      const relativePath = getRelativePath(entry.path);
      replaceFileReferences([{
        path: entry.path,
        relativePath,
        name: entry.name,
        isDirectory: entry.is_directory
      }]);
      
      onFileClick(entry.path, entry.is_directory);
    }
  };

  const handleMouseEnter = async () => {
    if (!entry.is_directory && tokens === null && !loadingTokens) {
      setLoadingTokens(true);
      const calculatedTokens = await onCalculateTokens(entry.path);
      setTokens(calculatedTokens);
      setLoadingTokens(false);
    }
  };

  if (isFiltered(entry)) return null;

  return (
    <div
      className="group"
      style={{ marginLeft: `${level * 2}px` }}
      onMouseEnter={handleMouseEnter}
    >
      <div className="flex items-center gap-0.5 py-1 px-1 hover:bg-gray-100 rounded">
        {entry.is_directory && (
          <Button
            variant="ghost"
            size="icon"
            className="p-0.5 w-4 h-4"
            onClick={() => onToggleFolder(entry.path)}
          >
            {expandedFolders.has(entry.path) ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </Button>
        )}

        {getFileIcon(entry)}

        <span
          className="flex-1 text-sm cursor-pointer hover:text-blue-600"
          onClick={handleFileClickWithInput}
        >
          {entry.name}
        </span>

        {tokens !== null && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="text-xs">
                  {tokens}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tokens} tokens</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {entry.is_directory && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 p-1 h-auto mr-1"
                  onClick={() => onSetWorkingFolder(entry.path)}
                >
                  <FolderCheck className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Set as working folder</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 p-1 h-auto"
          onClick={handleAddToChatInput}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {entry.is_directory && expandedFolders.has(entry.path) && (
        <SubFolderContent
          folderPath={entry.path}
          level={level + 1}
          expandedFolders={expandedFolders}
          onToggleFolder={onToggleFolder}
          onAddToChat={onAddToChat}
          onFileClick={onFileClick}
          onSetWorkingFolder={onSetWorkingFolder}
          onCalculateTokens={onCalculateTokens}
          isFiltered={isFiltered}
        />
      )}
    </div>
  );
}