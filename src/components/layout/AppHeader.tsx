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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLayoutStore } from "@/stores/layoutStore";
import { invoke } from "@/lib/tauri-proxy";
import { useState, useEffect } from "react";
import { McpDialog } from "../dialogs/McpDialog";
import { useThemeStore } from "@/stores/ThemeStore";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import supabase from "@/lib/supabase";
import { AccentColorSelector } from "../common/AccentColorSelector";

export function AppHeader() {
  const { showFileTree, toggleFileTree, toggleChatPane } = useLayoutStore();
  const { theme, toggleTheme } = useThemeStore();
  const [codexVersion, setCodexVersion] = useState<string>("");
  const [isCodexAvailable, setIsCodexAvailable] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error("Error signing out:", e);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const handleNewWindow = async () => {
    try {
      await invoke("create_new_window");
    } catch (error) {
      console.error("Failed to create new window:", error);
    }
  };

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
          <span className="flex gap-2 items-center">
            <div
              className={`w-2 h-2 rounded-full ${isCodexAvailable ? "bg-green-500" : "bg-destructive"}`}
            ></div>
            <Badge>{codexVersion}</Badge>
          </span>
          Chat
        </Link>

        {/* Welcome button to projects page */}
        <Link to="/" className="flex hover:text-primary items-center gap-1">
          <PartyPopper className="w-5 h-5" /> Projects
        </Link>

        <Button 
          variant="ghost" 
          onClick={handleNewWindow}
          className="h-6 w-6"
          title="Open New Window"
        >
          <ExternalLink />
        </Button>

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

      <span className="flex items-center gap-2 h-6">
        <McpDialog>
          <Button variant="ghost" className="flex gap-1 h-6 px-1.5">
            <Usb /> MCP
          </Button>
        </McpDialog>

        <Link
          to="/usage"
          className="flex hover:text-primary items-center gap-1 -ml-1 hidden"
        >
          <BarChart3 className="w-4 h-4" /> Usage
        </Link>

        <Button variant="ghost" onClick={toggleChatPane} className="h-6 w-6">
          <Brain />
        </Button>
        <Button variant="ghost" className="h-6 w-6" onClick={toggleTheme}>
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>

        <AccentColorSelector />

        <Link
          to="/settings"
          className="flex hover:text-primary items-center gap-1"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-6 w-6 p-0 rounded-full">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    className="rounded-full w-6 h-6"
                    alt="User avatar"
                  />
                ) : (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs">
                    {user.email?.charAt(0)?.toUpperCase() ?? "U"}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/u/${user.id}`)}>View public page</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            to="/login"
            className="flex hover:text-primary items-center gap-1 px-2"
          >
            login
          </Link>
        )}
      </span>
    </div>
  );
}
