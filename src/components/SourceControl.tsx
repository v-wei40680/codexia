import { GitStatusView } from "@/components/filetree/GitStatusView";
import { useFolderStore } from "@/stores/FolderStore";
import { useLayoutStore } from "@/stores/settings/layoutStore";
import { invoke } from "@/lib/tauri-proxy";

export function SourceControl() {
  const { currentFolder } = useFolderStore();
  const { closeFile, setDiffFile } = useLayoutStore();

  const handleDiffClick = async (filePath: string) => {
    try {
      console.log("handleDiffClick called with:", filePath);
      console.log("currentFolder:", currentFolder);

      // Try with currentFolder first, then fallback to direct path
      const fullPath = currentFolder
        ? `${currentFolder}/${filePath}`
        : filePath;
      console.log("Trying full path:", fullPath);

      const result = await invoke<{
        original_content: string;
        current_content: string;
        has_changes: boolean;
      }>("get_git_file_diff", {
        filePath: fullPath,
      });

      if (result.has_changes) {
        // Clear selected file to avoid conflicts
        closeFile();
        // Set diff file and ensure panel is visible
        setDiffFile({
          original: result.original_content,
          current: result.current_content,
          fileName: filePath,
        });
      }
    } catch (error) {
      console.error("Failed to get diff:", error);
      console.error(
        "Tried path:",
        currentFolder ? `${currentFolder}/${filePath}` : filePath,
      );
    }
  };

  return (
    <GitStatusView
      currentFolder={currentFolder || undefined}
      onDiffClick={handleDiffClick}
    />
  );
}
