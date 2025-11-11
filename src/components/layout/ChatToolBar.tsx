import React from "react";
import { Button } from "../ui/button";
import { Globe, PenSquare, Terminal } from "lucide-react";
import { useLayoutStore } from "@/stores/settings/layoutStore";
import { useFolderStore } from "@/stores/FolderStore";
import { detectWebFramework } from "@/utils/webFrameworkDetection";
import { useChatInputStore } from "@/stores/chatInputStore";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { runCommand } from "@/utils/runCommand";
import { useCodexStore } from "@/stores/useCodexStore";

const DEFAULT_DEV_URL = "http://localhost:3000";

export const ChatToolbar: React.FC = () => {
  const { cwd } = useCodexStore();
  const { showWebPreview, setWebPreviewUrl } = useLayoutStore();
  const { currentFolder } = useFolderStore();
  const { clearAll, requestFocus } = useChatInputStore();
  const { setActiveConversationId, activeConversationId } = useActiveConversationStore();

  const handleNewConversation = React.useCallback(() => {
    setActiveConversationId(null);
    clearAll();
    requestFocus();
  }, [setActiveConversationId, clearAll, requestFocus]);

  const handleToggleWebPreview = React.useCallback(async () => {
    if (showWebPreview) {
      setWebPreviewUrl(null);
      return;
    }

    let devUrl = DEFAULT_DEV_URL;

    if (currentFolder) {
      try {
        const frameworkInfo = await detectWebFramework(currentFolder);
        if (frameworkInfo) {
          devUrl = frameworkInfo.devUrl;
        }
      } catch (error) {
        console.error("Failed to detect web framework:", error);
      }
    }

    setWebPreviewUrl(devUrl);
  }, [showWebPreview, setWebPreviewUrl, currentFolder]);

  const handleRunCommand = React.useCallback(() => {
    if (activeConversationId) {
      runCommand(activeConversationId, cwd);
    }
  }, [activeConversationId, cwd]);

  // Cmd/Ctrl+N shortcut for new conversation
  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        handleNewConversation();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [handleNewConversation]);

  return (
    <div className="flex justify-between gap-2 px-2 w-full">
      <span className="flex gap-2">
        <Button size="icon" onClick={handleNewConversation} title="New Conversation (Cmd/Ctrl+N)">
          <PenSquare />
        </Button>
        
        <Button
          size="icon"
          variant="secondary"
          onClick={handleRunCommand}
          disabled={!activeConversationId}
          title="Run Command"
        >
          <Terminal />
        </Button>
      </span>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleWebPreview}
        className={showWebPreview ? "bg-accent" : ""}
        title="Toggle Web Preview"
      >
        <Globe />
      </Button>
    </div>
  );
};
