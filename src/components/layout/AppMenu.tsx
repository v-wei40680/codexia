import { ExternalLink, EllipsisVertical, FilePen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { invoke } from "@/lib/tauri-proxy";
import { useNavigationStore } from "@/stores/navigationStore";
import { useTranslation } from "react-i18next";

export function AppMenu() {
  const { setMainView } = useNavigationStore();
  const { t } = useTranslation();

  const handleNewWindow = async () => {
    try {
      await invoke("create_new_window");
    } catch (error) {
      console.error("Failed to create new window:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title={t("header.menu")}
        >
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-64">
        <DropdownMenuItem asChild>
          <Button
            variant="ghost"
            onClick={handleNewWindow}
            className="w-full justify-start"
            title={t("header.openNewWindow")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {t("header.openNewWindow")}
          </Button>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Button
            variant="ghost"
            onClick={() => setMainView("agents-editor")}
            className="w-full justify-start"
            title="Agents editor"
          >
            <FilePen className="w-4 h-4 mr-2" />
            Agents.md editor
          </Button>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Button
            variant="ghost"
            onClick={() => setMainView("claude-md-editor")}
            className="w-full justify-start"
            title="claude.md editor"
          >
            <FilePen className="w-4 h-4 mr-2" />
            claude.md editor
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
