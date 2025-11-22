import { Button } from "@/components/ui/button";

interface SettingsSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  return (
    <div className="w-64 border-r bg-muted/30 px-4 space-y-2">
      <Button
        variant={activeSection === "login" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => onSectionChange("login")}
      >
        Codex login
      </Button>
      <Button
        variant={activeSection === "rateLimit" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => onSectionChange("rateLimit")}
      >
        Codex rate limit
      </Button>
      <Button
        variant={activeSection === "promptOptimizer" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => onSectionChange("promptOptimizer")}
      >
        Prompt Optimizer
      </Button>
      <Button
        variant={activeSection === "exclude" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => onSectionChange("exclude")}
      >
        Exclude Folders
      </Button>
      <Button
        variant={activeSection === "remoteAccess" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => onSectionChange("remoteAccess")}
      >
        Remote Access
      </Button>
      <Button
        variant={activeSection === "gitWorktree" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => onSectionChange("gitWorktree")}
      >
        Git Worktree
      </Button>
      <Button
        variant={activeSection === "environmentVariables" ? "default" : "ghost"}
        className="w-full justify-start"
        onClick={() => onSectionChange("environmentVariables")}
      >
        Environment Variables
      </Button>
    </div>
  );
}
