import { ProjectPanel } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { useNavigationStore } from '@/stores/navigationStore';

export function HomeView() {
  const { setMainView, setSidebarTab } = useNavigationStore();
  return (
    <div className="m-auto flex flex-col items-center gap-4">
      <div className="flex mt-8 gap-2">
        <Button onClick={() => {
          setMainView('codex')
          setSidebarTab('codex')
        }}>Codex</Button>
        <Button onClick={() => {
          setMainView('cc')
          setSidebarTab('cc')
        }}>Claude Code</Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => setMainView('prompt')}>Prompt</Button>
        <Button onClick={() => setMainView('skills')}>Skills</Button>
        <Button onClick={() => setMainView('mcp')}>MCP</Button>
      </div>
      <ProjectPanel />
    </div>
  );
}
