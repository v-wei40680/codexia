import { ProjectPanel } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { useNavigationStore } from '@/stores/navigationStore';

export function HomeView() {
  const { setMainView, setSidebarTab, setSelectedAgent, setInstructionType } = useNavigationStore();
  return (
    <div className="m-auto flex flex-col items-center gap-4">
      <div className="flex mt-8 gap-2">
        <Button onClick={() => {
          setSelectedAgent('codex')
          setMainView('codex')
          setSidebarTab('codex')
        }}>Codex</Button>
        <Button onClick={() => {
          setSelectedAgent('cc')
          setMainView('cc')
          setSidebarTab('cc')
        }}>Claude Code</Button>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => {
          setSelectedAgent('codex')
          setInstructionType('system')
          setMainView('agents-editor')
          setSidebarTab(null)
        }}>Codex</Button>
        <Button onClick={() => {
          setSelectedAgent('cc')
          setInstructionType('system')
          setMainView('agents-editor')
          setSidebarTab(null)
        }}>Claude Code</Button>
        <span className="flex">System instructions</span>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => {
          setSelectedAgent('codex')
          setInstructionType('project')
          setMainView('agents-editor')
          setSidebarTab(null)
        }}>Codex</Button>
        <Button onClick={() => {
          setSelectedAgent('cc')
          setInstructionType('project')
          setMainView('agents-editor')
          setSidebarTab(null)
        }}>Claude Code</Button>
        <span className="flex">Project instructions</span>
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
