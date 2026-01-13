import { ProjectPanel } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { useNavigationStore } from '@/stores/navigationStore';
import { useRandomQuote } from '@/hooks/useRandomQuote';
import { useSettingsStore } from '@/stores/settings/SettingsStore';
import { Settings } from 'lucide-react';

export function HomeView() {
  const { setMainView, setSidebarTab, setSelectedAgent, selectedAgent } = useNavigationStore();
  const { setActiveSection } = useSettingsStore();
  const quote = useRandomQuote(selectedAgent);

  return (
    <div className="m-auto flex flex-col items-center gap-4 w-full max-w-4xl px-6">
      {quote && (
        <div className="w-full mt-4 p-4 rounded-2xl bg-gradient-to-br from-card/20 to-card/5 backdrop-blur-md border border-border/30 shadow-lg text-center relative overflow-hidden group transition-all hover:shadow-blue-500/5">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />

          <div className="relative z-10">
            <p className="font-serif italic leading-relaxed whitespace-pre-wrap">
              {quote.content}
            </p>
            <p className="mt-4 text-sm text-muted-foreground font-light tracking-wide flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setMainView('settings');
                  setActiveSection('quote');
                }}
                className="p-1 hover:bg-muted rounded-full transition-colors ml-1"
                title="Quote settings"
              >
                <Settings className="w-3 h-3 text-muted-foreground/60" />
              </button>
              {quote.author}
            </p>
          </div>

          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />
          <div className="absolute -top-8 -left-8 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl" />
        </div>
      )}
      <div className="flex rounded-lg bg-muted p-1 gap-1">
        {(
          [
            { id: 'codex', label: 'Codex', active: 'border-blue-500 text-blue-600', inactive: 'text-blue-500 hover:border-blue-500/40 hover:bg-blue-500/5' },
            { id: 'cc', label: 'Claude Code', active: 'border-orange-500 text-orange-600', inactive: 'text-orange-500 hover:border-orange-500/40 hover:bg-orange-500/5' }
          ] as const
        ).map((agent) => (
          <button
            key={agent.id}
            className={`px-4 py-2 text-sm rounded-md border-2 transition-all ${selectedAgent === agent.id
              ? `${agent.active} bg-background shadow-sm`
              : `border-transparent ${agent.inactive}`
              }`}
            onClick={() => setSelectedAgent(agent.id)}
          >
            {agent.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => {
          setMainView('agents-editor')
          setSidebarTab(null)
        }}>Agent Instructions</Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" onClick={() => setMainView('prompt')}>Prompt</Button>
        <Button variant="secondary" onClick={() => setMainView('skills')}>Skills</Button>
        <Button variant="secondary" onClick={() => setMainView('mcp')}>MCP</Button>
      </div>

      <ProjectPanel />
    </div>
  );
}
