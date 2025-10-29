import React from "react";
import { Button } from "../ui/button";
import { PencilIcon } from "lucide-react";
import { useNoteStore } from "@/stores/NoteStore";

export const AppToolbar: React.FC = () => {
  const { createNote, setCurrentNote } = useNoteStore();

  const handleCreateNote = () => {
    const newNote = createNote();
    setCurrentNote(newNote.id);
  };

  return (
    <div className="flex items-center justify-end gap-2 px-2">
      <Button
        onClick={handleCreateNote}
        size="icon"
        className="h-7 w-7 p-0"
        title="Create New Note"
      >
        <PencilIcon className="h-3 w-3" />
      </Button>
    </div>
  );
};
