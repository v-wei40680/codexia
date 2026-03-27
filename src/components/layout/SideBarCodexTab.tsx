import { ThreadList } from '@/components/codex/ThreadList';
import { SideBarProjectList } from './SideBarProjectList';

type Props = {
  /** Called when user wants to create a new thread in a given project. */
  onCreateNewThread: (project: string) => void;
};

export function SideBarCodexTab({ onCreateNewThread }: Props) {
  return (
    <SideBarProjectList
      onNewAction={onCreateNewThread}
      newActionTitle={(name) => `Start new thread in ${name}`}
      renderList={(project) => <ThreadList cwdOverride={project} />}
    />
  );
}
