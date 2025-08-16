import React from "react";
import { NoteList, NoteEditor } from "./notes";
import { ConfigIndicator } from "./ConfigIndicator";
import { useLayoutStore } from "@/stores/layoutStore";

interface SimpleNotesComponentProps {
  onOpenConfig: () => void;
  onToggleSessionManager?: () => void;
}

export const SimpleNotesComponent: React.FC<SimpleNotesComponentProps> = ({
  onOpenConfig,
  onToggleSessionManager,
}) => {
  const { showNotesList } = useLayoutStore();

  return (
    <div className="flex flex-col h-full min-h-0">
      <ConfigIndicator
        onOpenConfig={onOpenConfig}
        onToggleSessionManager={onToggleSessionManager}
      />
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
    </div>
  );
};
