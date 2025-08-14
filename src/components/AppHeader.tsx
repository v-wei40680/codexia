import {
  PartyPopper,
  Usb,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useLayoutStore } from "@/stores/layoutStore";
import { useFolderStore } from "@/stores/FolderStore";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";

const routeLinks = [
  { to: "/", icon: <PartyPopper /> },
  { to: "/dxt", icon: <Usb /> },
];

export function AppHeader() {
  const { showFileTree, toggleFileTree } = useLayoutStore();
  const { currentFolder } = useFolderStore();
  const [codexVersion, setCodexVersion] = useState<string>("");
  const [isCodexAvailable, setIsCodexAvailable] = useState<boolean>(false);

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
      <span className="flex gap-1 items-center">
        <Badge>{codexVersion}</Badge>
        <div className={`w-2 h-2 rounded-full ${isCodexAvailable ? "bg-green-500" : "bg-red-500"}`}></div>
        {/* Welcome button to projects page */}
        <Link to="/" className="flex">
          <PartyPopper className="w-5 h-5" /> Projects
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
      </span>
    </div>
  );
}
