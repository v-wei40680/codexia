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
  HeartHandshake,
  Airplay,
  EllipsisVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useLayoutStore } from "@/stores/settings/layoutStore";
import { invoke, isRemoteRuntime} from "@/lib/tauri-proxy";
import { useThemeStore } from "@/stores/settings/ThemeStore";
import { useTranslation } from "react-i18next";
import { AccentColorSelector } from "../common/AccentColorSelector";
import { LanguageSelector } from "../common/LanguageSelector";
import { PublishCloudDialog } from "../dialogs/PublishCloudDialog";
import { UserDropdown } from "../common/UserDropdown";
import { useCodexStore } from "@/stores/codex";
import { Badge } from "../ui/badge";
import { useSettingsStore } from "@/stores";

export function AppHeader() {
  const { showFileTree, toggleFileTree, toggleChatPane } = useLayoutStore();
  const { theme, toggleTheme } = useThemeStore();
  const { setActiveSection } = useSettingsStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { cwd } = useCodexStore();
  const currentPlatform = navigator.userAgent.includes("Mac") ? "macos" : "other";

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
      className={`flex justify-between items-center border-b bg-background/80 backdrop-blur-sm shadow-sm ${isRemoteRuntime() ? "" : (currentPlatform === "macos" ? "pl-20 pr-4" : "pr-32")}`}
    >
      {/* Left Section */}
      <div className="flex items-center gap-2">
        {showFileTree && (
          <>
            <Link
              to="/"
              className="flex hover:text-primary items-center gap-1"
              title={t("header.projects")}
            >
              <PartyPopper /> {t("header.projects")}
            </Link>
            <Link
              to="/chat"
              className="flex hover:text-primary items-center gap-1"
              title="Codex"
            >
              <img src="/codex.svg" className="w-4 h-4" /> Codex
            </Link>

            <Link
              to="/cc"
              className="flex hover:text-primary items-center gap-1"
              title="claude code"
            >
              <BotMessageSquare /> cc
            </Link>
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFileTree}
          className={`${showFileTree ? "bg-primary/20" : ""}`}
          title={t("header.toggleChatPane")}
        >
          <PanelLeft />
        </Button>
      </div>

      <Badge>{cwd}</Badge>

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
              size="icon"
              className="h-6 w-6"
              title={t("header.menu")}
            >
              <EllipsisVertical />
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
            <DropdownMenuItem asChild>
              <Button
                variant="ghost"
                onClick={() => {
                  navigate("/settings");
                  setActiveSection("remoteAccess");
                }}
                className="h-6 w-6 justify-start"
                title={t("header.remoteControl")}
              >
                <Airplay />
                {t("header.remoteControl")}
              </Button>
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
            <DropdownMenuItem asChild>
              <Link to="/donate" className="flex items-center gap-1">
                <HeartHandshake className="w-4 h-4" /> {t("header.donate")}
              </Link>
            </DropdownMenuItem>
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
