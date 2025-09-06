import {
  PartyPopper,
  Usb,
  PanelLeft,
  Settings,
  BarChart3,
  Sun,
  Moon,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "react-router-dom";
import { useLayoutStore } from "@/stores/layoutStore";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";
import { McpDialog } from "../dialogs/McpDialog";
import { useThemeStore } from "@/stores/ThemeStore";
import { useSettingsStore } from "@/stores/SettingsStore";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const { showFileTree, toggleFileTree, toggleChatPane } = useLayoutStore();
  const { theme, toggleTheme } = useThemeStore();
  const { logoSettings } = useSettingsStore();
  const [codexVersion, setCodexVersion] = useState<string>("");
  const [isCodexAvailable, setIsCodexAvailable] = useState<boolean>(false);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const version = await invoke<string>("check_codex_version");
        setCodexVersion(version);
        setIsCodexAvailable(true);
      } catch (error) {
        setCodexVersion("Not available");
        setIsCodexAvailable(false);
      }
    };

    checkVersion();
  }, []);

  return (
    <div data-tauri-drag-region className="flex justify-between px-2">
      <span className="flex gap-2 items-center">
        <Link to="/chat" className="flex hover:text-primary items-center gap-1">
          {logoSettings.useCustomLogo && logoSettings.customLogoPath ? (
            <img
              src={logoSettings.customLogoPath}
              alt="Custom Logo"
              className="h-6 w-auto object-contain"
            />
          ) : (
            <span className="flex gap-2 items-center">
              <div
                className={`w-2 h-2 rounded-full ${isCodexAvailable ? "bg-green-500" : "bg-destructive"}`}
              ></div>
              <Badge>{codexVersion}</Badge>
            </span>
          )}
          Chat
        </Link>

        {/* Welcome button to projects page */}
        <Link to="/" className="flex hover:text-primary items-center gap-1">
          <PartyPopper className="w-5 h-5" /> Projects
        </Link>

        {location.pathname === "/chat" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFileTree}
            className={`h-6 w-6 ${showFileTree ? "bg-primary/20" : ""}`}
          >
            <PanelLeft className="w-3 h-3" />
          </Button>
        )}
      </span>

      <span className="flex gap-0 h-6">
        {location.pathname === "/chat" && (
          <McpDialog>
            <Button variant="ghost" className="flex gap-1 h-6">
              <Usb />
              MCP
            </Button>
          </McpDialog>
        )}

        <Link
          to="/usage"
          className="flex hover:text-primary items-center gap-1"
        >
          <BarChart3 className="w-4 h-4" /> Usage
        </Link>

        <Button variant="ghost" onClick={toggleChatPane} className="h-6 w-6">
          <Brain />
        </Button>

        <Button variant="ghost" className="h-6 w-6" onClick={toggleTheme}>
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>

        <Link
          to="/settings"
          className="flex hover:text-primary items-center gap-1"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>

        {import.meta.env.EnableAuth &&
          <>
          {user?.user_metadata.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              className="rounded-full w-6 h-6"
            />
          ) : (
            <Link
              to="/login"
              className="flex hover:text-primary items-center gap-1 px-2"
            >
              login
            </Link>
          )}
          </>
        }
      </span>
    </div>
  );
}
