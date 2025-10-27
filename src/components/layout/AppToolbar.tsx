import React, { useState } from "react";
import { Button } from "../ui/button";
import {
  Settings,
  PencilIcon,
  Globe,
} from "lucide-react";
import { useNoteStore } from "@/stores/NoteStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useFolderStore } from "@/stores/FolderStore";
import { detectWebFramework } from "@/utils/webFrameworkDetection";
import { useChatSession } from "@/hooks/useChatSession";
import { useNavigate } from "react-router-dom";
import { useCodexStore } from "@/stores/CodexStore";
import { ConfigDialog } from "@/components/dialogs/ConfigDialog";

export const AppToolbar: React.FC = () => {
  const { createNote, setCurrentNote } = useNoteStore();
  const { showWebPreview, setWebPreviewUrl, selectedLeftPanelTab } = useLayoutStore();
  const { currentFolder } = useFolderStore();
  const { createConversation } = useChatSession();
  const navigate = useNavigate();
  const { config, setConfig } = useCodexStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleCreateNote = () => {
    const newNote = createNote();
    setCurrentNote(newNote.id);
  };

  const handleCreateNewConversation = async () => {
    try {
      await createConversation();
      navigate("/chat");
    } catch (error) {
      console.error("Failed to create new conversation:", error);
    }
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

  return (
    <div className="flex items-center justify-end gap-2">

      {selectedLeftPanelTab !== "notes" && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleCreateNewConversation}
            title="New Conversation"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>

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
            onClick={() => setIsConfigOpen(true)}
            className="h-7 w-7 shrink-0"
            title="Configuration Settings"
          >
            <Settings />
          </Button>
        </>
      )}

      {selectedLeftPanelTab === "notes" && (
        <Button
          onClick={handleCreateNote}
          size="icon"
          className="h-7 w-7 p-0"
          title="Create New Note"
        >
          <PencilIcon className="h-3 w-3" />
        </Button>
      )}

      <ConfigDialog
        isOpen={isConfigOpen}
        config={config}
        onClose={() => setIsConfigOpen(false)}
        onSave={(newConfig) => {
          setConfig(newConfig);
        }}
      />
    </div>
  );
};
