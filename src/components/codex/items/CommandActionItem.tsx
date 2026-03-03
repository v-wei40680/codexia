import { Badge } from '@/components/ui/badge';
import { CommandAction } from '@/bindings/v2';
import { getFilename } from '@/utils/getFilename';
import { ShellCommand } from './ShellCommand';

export const CommandActionItem = ({ action }: { action: CommandAction }) => {
  const actionTypeLabel =
    action.type === 'listFiles'
      ? 'Listed files'
      : action.type === 'read'
        ? 'Read'
        : action.type === 'search'
          ? 'Search'
          : null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        {actionTypeLabel}
        {action.type === 'search' && (
          <>
            <Badge variant="secondary">{action.query}</Badge> in{' '}
            {action.path && <Badge variant="secondary">{getFilename(action.path)}</Badge>}
          </>
        )}
        {(action.type === 'read' || action.type === 'listFiles') && action.path && (
          <Badge variant="secondary">{getFilename(action.path)}</Badge>
        )}
        {action.type === 'unknown' && <ShellCommand command={action.command} />}
      </div>
    </div>
  );
};
