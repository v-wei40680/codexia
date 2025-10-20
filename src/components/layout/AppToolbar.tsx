import React from "react";
import { Button } from "../ui/button";
import {
  Settings,
  PencilIcon,
  History,
  Globe,
} from "lucide-react";
import { useNoteStore } from "@/stores/NoteStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useFolderStore } from "@/stores/FolderStore";
import { detectWebFramework } from "@/utils/webFrameworkDetection";

interface AppToolbarProps {
  onOpenConfig: () => void;
  onCreateNewSession?: () => void;
  currentTab?: string;
  onSwitchToTab?: (tab: string) => void;
  onNewConversationClick: () => void;
}

export const AppToolbar: React.FC<AppToolbarProps> = ({
  onOpenConfig,
  currentTab,
  onSwitchToTab,
  onNewConversationClick,
}) => {
  const { createNote, setCurrentNote } = useNoteStore();
  const { showWebPreview, setWebPreviewUrl } = useLayoutStore();
  const { currentFolder } = useFolderStore();

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

  const handleToggleWebPreview = async () => {
    if (showWebPreview) {
      setWebPreviewUrl(null);
    } else {
      let defaultUrl = 'http://localhost:3000';
      
      // Try to detect web framework and use appropriate URL
      if (currentFolder) {
        try {
          const frameworkInfo = await detectWebFramework(currentFolder);
          if (frameworkInfo) {
            defaultUrl = frameworkInfo.devUrl;
          }
        } catch (error) {
          console.error('Failed to detect web framework:', error);
        }
      }
      
      setWebPreviewUrl(defaultUrl);
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
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onNewConversationClick}
            title="New Conversation"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <PanelToggleButton />

          {/* Web Preview Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleWebPreview}
            className={`h-7 w-7 shrink-0 ${showWebPreview ? 'bg-accent' : ''}`}
            title="Toggle Web Preview"
          >
            <Globe />
          </Button>

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
