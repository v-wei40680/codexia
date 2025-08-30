import React from "react";
import { Button } from "../ui/button";
import {
  Settings,
  PencilIcon,
  History,
} from "lucide-react";
import { useConversationStore } from "@/stores/ConversationStore";
import { useNoteStore } from "@/stores/NoteStore";

interface AppToolbarProps {
  onOpenConfig: () => void;
  onCreateNewSession?: () => void;
  currentTab?: string;
  onSwitchToTab?: (tab: string) => void;
}

export const AppToolbar: React.FC<AppToolbarProps> = ({
  onOpenConfig,
  onCreateNewSession,
  currentTab,
  onSwitchToTab,
}) => {
  const { setPendingNewConversation, setCurrentConversation } =
    useConversationStore();
  const { createNote, setCurrentNote } = useNoteStore();

  const handleToggleLeftPanel = () => {
    if (!onSwitchToTab) return;
    
    if (currentTab === "notes") {
      // Switch to notes tab in left panel
      onSwitchToTab("notes");
    } else {
      // Switch to chat tab in left panel for conversation management
      onSwitchToTab("chat");
    }
  };

  const handleCreateNote = () => {
    const newNote = createNote();
    setCurrentNote(newNote.id);
  };

  const handleCreateConversation = () => {
    if (onCreateNewSession) {
      // Use the callback for full session creation if provided
      onCreateNewSession();
    } else {
      // Set pending state to prepare for new conversation
      setPendingNewConversation(true);
      // Clear current conversation to show new chat interface
      // The actual session ID will be created when user sends first message
      setCurrentConversation('');
    }
  };

  const PanelToggleButton = () => (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={handleToggleLeftPanel}
      title="Toggle Panel"
    >
      <History />
    </Button>
  );

  return (
    <div className="flex items-center justify-end gap-2">

      {currentTab !== "notes" && (
        <>
          {/* Create Conversation Button */}
          <Button
            onClick={handleCreateConversation}
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-0"
            title="Create New Conversation"
          >
            <PencilIcon />
          </Button>

          <PanelToggleButton />

          {/* Settings Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenConfig}
            className="h-7 w-7 shrink-0"
            title="Configuration Settings"
          >
            <Settings />
          </Button>
        </>
      )}

      {currentTab === "notes" && (
        <>
          <Button
            onClick={handleCreateNote}
            size="icon"
            className="h-7 w-7 p-0"
            title="Create New Note"
          >
            <PencilIcon className="h-3 w-3" />
          </Button>
          <PanelToggleButton />
        </>
      )}
    </div>
  );
};
