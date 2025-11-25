import React from "react";
import { NoteEditor } from "./NoteEditor";


export const NotesView: React.FC = () => {

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-h-0 h-full min-w-0">
  
        <NoteEditor />
      </div>
    </div>
  );
};
