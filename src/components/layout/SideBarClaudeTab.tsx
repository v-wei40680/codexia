import { ClaudeCodeSessionList } from '../cc/SessionList';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { SideBarProjectList } from './SideBarProjectList';

type Props = {
  /** Called when user wants to start a new CC session in a given project. */
  onStartNewSession: (project: string) => void;
};

export function SideBarClaudeTab({ onStartNewSession }: Props) {
  const { handleSessionSelect } = useCCSessionManager();

  return (
    <SideBarProjectList
      onNewAction={onStartNewSession}
      newActionTitle={(name) => `Start new session in ${name}`}
      renderList={(project) => (
        <ClaudeCodeSessionList project={project} onSelectSession={handleSessionSelect} />
      )}
    />
  );
}
