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
} from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
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
// import { UserDropdown } from "../common/UserDropdown";

export function AppHeader() {
  const {
    showFileTree,
    toggleFileTree,
    toggleChatPane,
    showHeaderActions,
    toggleHeaderActions,
  } = useLayoutStore();
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
          <PartyPopper className="w-5 h-5" /> {t("header.projects")}
        </Link>

        <Button
          variant="ghost"
          onClick={handleNewWindow}
          className="h-6 w-6"
          title={t("header.openNewWindow")}
        >
          <ExternalLink />
        </Button>

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
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          className="h-6 w-6"
          onClick={toggleHeaderActions}
          title={
            showHeaderActions
              ? t("header.hideHeaderActions")
              : t("header.showHeaderActions")
          }
        >
          {showHeaderActions ? <EyeOff /> : <Eye />}
        </Button>

        {showHeaderActions && (
          <>
            <Link
              to="/mcp"
              className="flex hover:text-primary items-center gap-1"
              title={t("header.mcp")}
            >
              <Usb className="w-4 h-4" />{t("header.mcp")}
            </Link>
            <Link
              to="/usage"
              className="flex hover:text-primary items-center gap-1"
              title={t("header.usage")}
            >
              <BarChart3 className="w-4 h-4" />{t("header.usage")}
            </Link>

            <Button
              variant="ghost"
              onClick={toggleChatPane}
              className="h-6 w-6"
              title={t("header.toggleChatPane")}
            >
              <Brain />
            </Button>

            <Button
              variant="ghost"
              className="h-6 w-6"
              onClick={toggleTheme}
              title={t("header.toggleTheme")}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>

            <LanguageSelector />
            <AccentColorSelector />

            <Link
              to="/settings"
              className="flex hover:text-primary items-center gap-1"
            >
              <Settings className="w-4 h-4" />
            </Link>

            {/* <UserDropdown /> */}
            <PublishCloudDialog />
          </>
        )}
      </div>
    </div>
  );
}
