import { FileChange } from "@/bindings/FileChange";
import { Badge } from "@/components/ui/badge";

export const renderFileChanges = (changes: { [key: string]: FileChange }) => {
  return Object.entries(changes).map(([filePath, fileChange]) => (
    <div key={filePath} className="space-y-1">
      {"add" in fileChange ? (
        <>
          <span className="bg-green-200 dark:bg-green-500 p-0.5 rounded">
            Add
          </span>
          <Badge variant="secondary">{filePath}</Badge>
        </>
      ) : "delete" in fileChange ? (
        <>
          <span className="bg-red-200 dark:bg-red-500 p-0.5 rounded">
            Delete
          </span>
          <Badge variant="secondary">{filePath}</Badge>
        </>
      ) : "update" in fileChange ? (
        <>
          <span className="bg-red-200 dark:bg-red-500 p-0.5 rounded">
            Update
          </span>
          <span>{fileChange.update.move_path}</span>
          <Badge variant="secondary">{filePath}</Badge>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          No content or diff available.
        </p>
      )}
    </div>
  ));
};
