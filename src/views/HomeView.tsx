import { ProjectPanel } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { useNavigationStore } from '@/stores/navigationStore';

export function HomeView() {
  const { setMainView } = useNavigationStore();
  return (
    <div className="m-auto flex flex-col items-center gap-4">
      <div className="mt-8">
        <Button onClick={() => setMainView('codex')}>Codex</Button>
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
