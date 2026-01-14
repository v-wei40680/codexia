import type { ReactNode } from "react";
import { GitBranch, MessagesSquare, TerminalSquare } from "lucide-react";

type TabletNavTab = "codex" | "git" | "log";

type TabletNavProps = {
  activeTab: TabletNavTab;
  onSelect: (tab: TabletNavTab) => void;
};

const tabs: { id: TabletNavTab; label: string; icon: ReactNode }[] = [
  { id: "codex", label: "Codex", icon: <MessagesSquare className="h-5 w-5" /> },
  { id: "git", label: "Git", icon: <GitBranch className="h-5 w-5" /> },
  { id: "log", label: "Log", icon: <TerminalSquare className="h-5 w-5" /> },
];

export function TabletNav({ activeTab, onSelect }: TabletNavProps) {
  return (
    <nav
      className="flex h-full min-h-0 flex-col gap-2.5 border-r border-border/60 bg-background/40 px-2 pt-9 pb-4"
      aria-label="Workspace"
    >
      <div className="flex flex-col gap-2.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={[
              "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center text-[11px] font-semibold tracking-[0.02em] transition-colors",
              activeTab === tab.id
                ? "border-primary/40 bg-muted/40 text-foreground"
                : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground",
            ].join(" ")}
            onClick={() => onSelect(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            {tab.icon}
            <span className="inline-flex w-full items-center justify-center">
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
