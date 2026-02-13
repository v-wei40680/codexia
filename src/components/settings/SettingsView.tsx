import { useState } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GeneralSettings } from './GeneralSettings';
import { ExplorerSettings } from './ExplorerSettings';
import { useLayoutStore } from '@/stores/settings';
import { ConfigSettings, ArchivedThreadSettings, PersonalizationSettings } from './codex';
import { CodexAuth } from '../codex/CodexAuth';
import { QuoteSettings } from './QuoteSettings';
import { ProjectsSettings } from './ProjectsSettings';
import { RateLimitSettings, TaskSettings } from './codex';

type SettingsSection =
  | 'general'
  | 'projects'
  | 'codexauth'
  | 'config'
  | 'personalization'
  | 'archived'
  | 'explorer'
  | 'quote'
  | 'task';

const codexSections = ['codexauth', 'task', 'config', 'personalization', 'archived'] as const;
const topLevelSections = ['general', 'projects', 'explorer', 'quote'] as const;

const sectionLabel: Record<SettingsSection, string> = {
  general: 'General',
  projects: 'Projects',
  codexauth: 'Codex auth',
  config: 'Configuration',
  personalization: 'Personalization',
  archived: 'Archived threads',
  explorer: 'Explorer',
  quote: 'Quote',
  task: 'Task',
};

export function SettingsView() {
  const { setView } = useLayoutStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [codexOpen, setCodexOpen] = useState(true);

  return (
    <SidebarProvider
      open
      onOpenChange={() => undefined}
      className="h-full w-full"
      style={
        {
          '--sidebar-width': '15rem',
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="none">
        <SidebarHeader className="gap-2 p-2">
          <div className="flex items-center pl-20" data-tauri-drag-region>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2"
              onClick={() => setView('codex')}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Back to app</span>
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent className="min-h-0 min-w-0 max-w-full overflow-x-hidden">
          <ScrollArea className="flex-1 min-h-0 min-w-0 max-w-full overflow-x-hidden">
            <ul className="space-y-1 px-2 text-sm">
              {topLevelSections.map((section) => (
                <li key={section}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(section)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${activeSection === section
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      }`}
                  >
                    {sectionLabel[section]}
                  </button>
                </li>
              ))}
              <li>
                <Collapsible open={codexOpen} onOpenChange={setCodexOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                    >
                      <span>Codex</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${codexOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pt-1">
                    {codexSections.map((section) => (
                      <button
                        key={section}
                        type="button"
                        onClick={() => setActiveSection(section)}
                        className={`w-full rounded-lg px-6 py-2 text-left transition-colors ${activeSection === section
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                          }`}
                      >
                        {sectionLabel[section]}
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </li>
            </ul>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="border-t border-border/60 p-2">
          <RateLimitSettings className="my-0 max-w-none" />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="h-8" data-tauri-drag-region />
        <div className="h-full min-h-0 w-full bg-background px-6 py-5 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {activeSection === 'general' && <GeneralSettings />}
            {activeSection === 'projects' && <ProjectsSettings />}
            {activeSection === 'codexauth' && <CodexAuth />}
            {activeSection === 'config' && <ConfigSettings />}
            {activeSection === 'personalization' && <PersonalizationSettings />}
            {activeSection === 'archived' && <ArchivedThreadSettings />}
            {activeSection === 'explorer' && <ExplorerSettings />}
            {activeSection === 'quote' && <QuoteSettings />}
            {activeSection === 'task' && <TaskSettings />}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
