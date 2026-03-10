import { useCCStore } from '@/stores/ccStore';
import type { CCMessage as CCMessageType, ToolResultBlock } from '../types/messages';
import { isToolResultBlock } from '../types/messages';
import { CCMessageContent } from './CCMessageContent';
import { PermissionRequestCard, type PermissionDecision } from './PermissionRequestCard';
import { SystemInitCard } from './SystemInitCard';
import { ResultCard } from './ResultCard';
import { safeStringify } from './utils';
import { Card } from '@/components/ui/card';

interface CCMessageProps {
  message: CCMessageType;
  index: number;
  inlineErrors?: Record<string, ToolResultBlock>;
}

const isToolBlock = (b: { type: string }) =>
  b.type === 'tool_use' || b.type === 'tool_result';

export function CCMessage({ message: msg, index: idx, inlineErrors }: CCMessageProps) {
  const { updateMessage } = useCCStore();

  const handleResolvePermission = async (requestId: string, decision: PermissionDecision) => {
    const { ccResolvePermission } = await import('@/services');
    try {
      await ccResolvePermission(requestId, decision);
      updateMessage(idx, { resolved: decision } as any);
    } catch (err) {
      console.error('Failed to resolve permission:', err);
    }
  };

  switch (msg.type) {
    case 'assistant':
      return (
        <CCMessageContent
          msg={msg}
          index={idx}
          isToolBlock={isToolBlock}
          inlineErrors={inlineErrors}
        />
      );

    case 'user': {
      if (msg.text) {
        return (
          <Card className="p-3 bg-blue-50 dark:bg-blue-950">
            <div className="whitespace-pre-wrap text-sm">{msg.text}</div>
          </Card>
        );
      }
      const errors = msg.content?.filter((b) => isToolResultBlock(b) && b.is_error) ?? [];
      if (errors.length === 0) return null;
      // Errors are rendered inline in the preceding assistant message's ToolUseBadges
      return null;
    }

    case 'permission_request':
      return (
        <PermissionRequestCard
          msg={msg}
          onResolve={handleResolvePermission}
        />
      );

    case 'system':
      return msg.subtype === 'init' ? (
        <SystemInitCard msg={msg} />
      ) : null;

    case 'result':
      return <ResultCard msg={msg} />;

    case 'stream_event':
      return null;

    default:
      return (
        <Card className="p-3">
          <pre className="text-xs overflow-auto max-h-64">
            <code>{safeStringify(msg)}</code>
          </pre>
        </Card>
      );
  }
}

