import {
  PanelRightOpen,
  PanelRightClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isRemoteRuntime } from "@/lib/tauri-proxy";
import { PublishCloudDialog } from "../dialogs/PublishCloudDialog";
import { UserDropdown } from "../common/UserDropdown";
import { useCodexStore } from "@/stores/codex";
import { useNavigationStore } from "@/stores/navigationStore";
import { Badge } from "@/components/ui/badge";
import { AppMenu } from "./AppMenu";

export function AppHeader() {
  const { cwd } = useCodexStore();
  const { rightView, setRightView, sidebarVisible, setSidebarVisible } =
    useNavigationStore();
  const currentPlatform = navigator.userAgent.includes("Mac")
    ? "macos"
    : "other";

  return (
    <div
      data-tauri-drag-region
      className={`flex justify-between items-center border-b bg-background/80 backdrop-blur-sm shadow-sm ${isRemoteRuntime() ? "" : currentPlatform === "macos" ? "pl-20 pr-4" : "pr-32"}`}
    >
      {/* Left Section - Sidebar Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarVisible(!sidebarVisible)}
          title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
        >
          <PanelLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Center Section */}
      <Badge>{cwd.split(/[\\/]/).pop()}</Badge>

      {/* Right Section - Right Panel Toggles, Settings and Menu */}
      <div className="flex gap-2 items-center">
        <Button
          variant={"outline"}
          size="icon"
          onClick={() => setRightView(rightView ? null : "notepad")}
          title={rightView ? "Hide right panel" : "Show right panel"}
        >
          {rightView ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </Button>
        <PublishCloudDialog />
        <UserDropdown />
        <AppMenu />
      </div>
    </div>
  );
}
