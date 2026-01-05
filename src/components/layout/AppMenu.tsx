import { ExternalLink, EllipsisVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { invoke } from "@/lib/tauri-proxy";
import { useTranslation } from "react-i18next";

export function AppMenu() {
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
