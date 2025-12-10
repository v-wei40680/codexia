import { FileViewer } from "../filetree/FileViewer";
import { useLayoutStore } from "@/stores";
import { useNoteStore } from "@/stores/useNoteStore";

export function FileExplorerPanel() {
  const { selectedFile, closeFile } = useLayoutStore();

  return (
    <div className="h-full">
      {selectedFile && (
        <>
          <div className="h-full overflow-auto">
            <FileViewer
              filePath={selectedFile}
              onClose={closeFile}
              addToNotepad={(content: string, source?: string) => {
                const {
                  getCurrentNote,
                  addContentToNote,
                  createNoteFromContent,
                } = useNoteStore.getState();
                const currentNote = getCurrentNote();
                if (currentNote) {
                  addContentToNote(currentNote.id, content, source);
                } else {
                  createNoteFromContent(content, source);
                }
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
