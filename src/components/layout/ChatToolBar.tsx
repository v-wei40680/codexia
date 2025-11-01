import React from "react";
import { Button } from "../ui/button";
import { Globe, PenSquare } from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { useFolderStore } from "@/stores/FolderStore";
import { detectWebFramework } from "@/utils/webFrameworkDetection";
import { useChatInputStore } from "@/stores/chatInputStore";
import { useSendMessage } from "@/hooks/useCodex";

export const ChatToolbar: React.FC = () => {
  const { showWebPreview, setWebPreviewUrl } = useLayoutStore();
  const { currentFolder } = useFolderStore();
  const { clearAll, requestFocus } = useChatInputStore();
  const { beginPendingConversation } = useSendMessage();

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

  return (
    <div className="flex justify-between gap-2 w-full">
      <Button
        size="icon"
        onClick={() => {
          beginPendingConversation();
          clearAll();
          requestFocus();
        }}
      >
        <PenSquare />
      </Button>
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
