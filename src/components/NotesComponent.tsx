import React from "react";
import { NoteList, NoteEditor } from "./notes";
import { useLayoutStore } from "@/stores/layoutStore";

export const NotesComponent: React.FC = () => {
  const { showNotesList } = useLayoutStore();

  return (
    <div className="flex h-full min-h-0">
      {showNotesList && (
        <div className="w-64 border-r h-full flex-shrink-0">
          <NoteList />
        </div>
      )}
      <div className="flex-1 min-h-0 h-full min-w-0">
        <NoteEditor />
      </div>
    </div>
  );
};
