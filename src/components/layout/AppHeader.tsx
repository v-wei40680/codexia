import {
  PartyPopper,
  Usb,
  PanelLeft,
  Settings,
  BarChart3,
  Sun,
  Moon,
  Brain,
  ExternalLink,
  BotMessageSquare,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useLayoutStore } from "@/stores/settings/layoutStore";
import { invoke } from "@/lib/tauri-proxy";
import { useThemeStore } from "@/stores/settings/ThemeStore";
import { useTranslation } from "react-i18next";
import { AccentColorSelector } from "../common/AccentColorSelector";
import { LanguageSelector } from "../common/LanguageSelector";
import { PublishCloudDialog } from "../dialogs/PublishCloudDialog";
import { ClientPicker } from "../common/ClientPicker";
import { UserDropdown } from "../common/UserDropdown";
// import { UserDropdown } from "../common/UserDropdown";

export function AppHeader() {
  const { showFileTree, toggleFileTree, toggleChatPane } = useLayoutStore();
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();
  const { t } = useTranslation();

  const handleNewWindow = async () => {
    try {
      await invoke("create_new_window");
    } catch (error) {
      console.error("Failed to create new window:", error);
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="flex justify-between items-center pr-4 border-b bg-background/80 backdrop-blur-sm shadow-sm"
    >
      {/* Left Section */}
      <div className="flex items-center gap-2">
        <ClientPicker />

        <Link
          to="/chat"
          className="flex hover:text-primary items-center gap-1"
          title={t("header.chat")}
        >
          <BotMessageSquare /> {t("header.chat")}
        </Link>

        <Link
          to="/"
          className="flex hover:text-primary items-center gap-1"
          title={t("header.projects")}
        >
          <PartyPopper className="w-4 h-4" /> {t("header.projects")}
        </Link>

        {location.pathname === "/chat" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFileTree}
            className={`h-6 w-6 ${showFileTree ? "bg-primary/20" : ""}`}
            title={t("header.toggleChatPane")}
          >
            <PanelLeft />
          </Button>
        )}
      </div>

      {/* Right Section */}
      <div className="flex gap-2">
        <AccentColorSelector />
        <LanguageSelector />
        <PublishCloudDialog />
        <UserDropdown />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-6 w-6"
              title={t("header.menu")}
            >
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-64">
            <DropdownMenuItem asChild>
              <Button
                variant="ghost"
                onClick={handleNewWindow}
                className="h-6 w-6 justify-start"
                title={t("header.openNewWindow")}
              >
                <ExternalLink />
                {t("header.openNewWindow")}
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/mcp"
                className="flex items-center gap-1"
                title={t("header.mcp")}
              >
                <Usb className="w-4 h-4" />
                {t("header.mcp")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/usage"
                className="flex items-center gap-1"
                title={t("header.usage")}
              >
                <BarChart3 className="w-4 h-4" />
                {t("header.usage")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/agents.md"
                className="flex items-center gap-1"
                title="AGENTS"
              >
                <FileText className="w-4 h-4" /> AGENTS
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Button
                variant="ghost"
                onClick={toggleChatPane}
                className="h-6 w-6 justify-start"
                title={t("header.toggleChatPane")}
              >
                <Brain className="w-4 h-4" /> {t("header.toggleChatPane")}
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Button
                variant="ghost"
                className="h-6 w-6 justify-start"
                onClick={toggleTheme}
                title={t("header.toggleTheme")}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                {t("header.toggleTheme")}
              </Button>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-1">
                <Settings className="w-4 h-4" /> {t("header.settings")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
