
import { useState } from "react";
import { Files } from "lucide-react";
import { FileTreeItem } from "@/components/filetree/FileTreeItem";
import { useChatInputStore } from "@/stores/codex";
import { useLayoutStore } from "@/stores/settings/layoutStore";

export function AttachedFilesTab() {
  const { fileReferences, removeFileReference } = useChatInputStore();
  const { openFile, closeDiffFile } = useLayoutStore();

  const [expandedAddedFolders, setExpandedAddedFolders] = useState<Set<string>>(
    new Set(),
  );

  const handleToggleAddedFolder = (folderPath: string) => {
    setExpandedAddedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  // Check if a file should show remove button (only if it's in the original fileReferences list)
  const shouldShowRemoveButton = (filePath: string) => {
    return fileReferences.some((ref) => ref.path === filePath);
  };

  return (
    <div className="h-full overflow-auto p-2">
      {fileReferences.length === 0 ? (
        <div className="text-center text-muted-foreground mt-8">
          <Files size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No files added yet</p>
          <p className="text-xs mt-1">
            Add files from the Files tab to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          <div className="text-xs text-muted-foreground mb-2 px-2">
            {fileReferences.length} file
            {fileReferences.length !== 1 ? "s" : ""} added to chat
          </div>
          {fileReferences.map((ref) => (
            <FileTreeItem
              key={ref.path}
              entry={{
                name: ref.name,
                path: ref.path,
                is_directory: ref.is_directory,
                relativePath: ref.relativePath,
              }}
              level={0}
              expandedFolders={expandedAddedFolders}
              onToggleFolder={handleToggleAddedFolder}
              onAddToChat={(path) => console.log("Added to chat:", path)}
              onFileClick={(path, isDirectory) => {
                if (!isDirectory) {
                  closeDiffFile();
                  openFile(path);
                }
              }}
              onSetWorkingFolder={() => {}}
              onCalculateTokens={async () => null}
              isFiltered={() => false}
              showAddButton={true}
              onRemoveFromChat={(path) => removeFileReference(path)}
              preventFileReplace={true}
              shouldShowRemoveButton={shouldShowRemoveButton}
            />
          ))}
        </div>
      )}
    </div>
  );
}
