import React from "react";
import { Button } from "../ui/button";
import { Globe } from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { useFolderStore } from "@/stores/FolderStore";
import { detectWebFramework } from "@/utils/webFrameworkDetection";

export const ChatToolbar: React.FC = () => {
  const { showWebPreview, setWebPreviewUrl } = useLayoutStore();
  const { currentFolder } = useFolderStore();
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
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggleWebPreview}
      className={`h-7 w-7 shrink-0 ${showWebPreview ? "bg-accent" : ""}`}
      title="Toggle Web Preview"
    >
      <Globe />
    </Button>
  );
};
