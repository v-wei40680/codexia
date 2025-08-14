import {
  PartyPopper,
  Settings,
  Usb,
  PanelLeft,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLayoutStore } from "@/stores/layoutStore";
import { useFolderStore } from "@/stores/FolderStore";

const routeLinks = [
  { to: "/", icon: <PartyPopper /> },
  { to: "/dxt", icon: <Usb /> },
  { to: "/settings", icon: <Settings /> },
];

export function AppHeader() {
  const { showChatPane, showFileTree, toggleChatPane, toggleFileTree } =
    useLayoutStore();
  const { currentFolder } = useFolderStore();

  return (
    <div data-tauri-drag-region className="flex pl-20 mt-2 justify-between px-2">
      <span className="flex gap-1">
        {/* Welcome button to projects page */}
        <Link to="/">
          <PartyPopper className="w-5 h-5" />
        </Link>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFileTree}
          className={`h-6 w-6 ${showFileTree ? "bg-primary/20" : ""}`}
        >
          <PanelLeft className="w-3 h-3" />
        </Button>
        
      </span>

      {currentFolder}
      
      <span className="flex gap-2">
        {/* Route links for settings and dxt */}
        {routeLinks.slice(1).map(({ to, icon }) => (
          <Link key={to} to={to}>
            {icon}
          </Link>
        ))}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChatPane}
          className={`h-6 w-6 ${showChatPane ? "bg-primary/20" : ""}`}
        >
          <MessageSquare className="w-3 h-3" />
        </Button>
        
      </span>
    </div>
  );
}
