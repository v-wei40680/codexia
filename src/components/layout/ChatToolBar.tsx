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

export const ChatToolbar: React.FC = () => {
  const { cwd } = useCodexStore()
  const { showWebPreview, setWebPreviewUrl } = useLayoutStore();
  const { currentFolder } = useFolderStore();
  const { clearAll, requestFocus } = useChatInputStore();
  const { setActiveConversationId, activeConversationId } = useActiveConversationStore();

  const handleToggleWebPreview = async () => {
    if (showWebPreview) {
      setWebPreviewUrl(null);
    } else {
      let defaultUrl = "http://localhost:3000";

      // Try to detect web framework and use appropriate URL
      if (currentFolder) {
        try {
          const frameworkInfo = await detectWebFramework(currentFolder);
          if (frameworkInfo) {
            defaultUrl = frameworkInfo.devUrl;
          }
        } catch (error) {
          console.error("Failed to detect web framework:", error);
        }
      }

      setWebPreviewUrl(defaultUrl);
    }
  };

  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setActiveConversationId(null);
        clearAll();
        requestFocus();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [setActiveConversationId, clearAll, requestFocus]);

  return (
    <div className="flex justify-between gap-2 px-2 w-full">
      <span className="flex gap-2">
        <Button
          size="icon"
          onClick={() => {
            setActiveConversationId(null);
            clearAll();
            requestFocus();
          }}
        >
          <PenSquare />
        </Button>
        <Button
          size="icon"
          variant={"secondary"}
          onClick={() => activeConversationId  && runCommand(activeConversationId, cwd)}
        >
          <Terminal />
        </Button>
      </span>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleWebPreview}
        className={`${showWebPreview ? "bg-accent" : ""}`}
        title="Toggle Web Preview"
      >
        <Globe />
      </Button>
    </div>
  );
};
