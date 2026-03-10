import { useCCStore } from '@/stores/ccStore';
import type { CCMessage as CCMessageType } from '../types/messages';
import { CCMessageContent } from './CCMessageContent';
import { PermissionRequestCard } from './PermissionRequestCard';
import { SystemInitCard } from './SystemInitCard';
import { ResultCard } from './ResultCard';
import { safeStringify } from './utils';
import { Card } from '@/components/ui/card';

interface CCMessageProps {
  message: CCMessageType;
  index: number;
  inlineErrors?: Record<string, any>;
}

const isToolBlock = (b: { type: string }) =>
  b.type === 'tool_use' || b.type === 'tool_result';

export function CCMessage({ message: msg, index: idx, inlineErrors }: CCMessageProps) {
  const { updateMessage } = useCCStore();

  const handleResolvePermission = async (requestId: string, decision: any) => {
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
          msg={msg as any}
          index={idx}
          isToolBlock={isToolBlock}
          inlineErrors={inlineErrors}
        />
      );

    case 'user': {
      const text =
        msg.text ??
        (typeof (msg as any).message?.content === 'string'
          ? (msg as any).message.content
          : null);
      if (text) {
        return (
          <Card className="p-3 bg-blue-50 dark:bg-blue-950">
            <div className="whitespace-pre-wrap text-sm">{text}</div>
          </Card>
        );
      }
      const blocks =
        (msg as any).content ??
        (Array.isArray((msg as any).message?.content)
          ? (msg as any).message.content
          : null);
      const errors =
        blocks?.filter(
          (b: any) => b.type === 'tool_result' && b.is_error,
        ) ?? [];
      if (errors.length === 0) return null;
      // Errors are rendered inline in the preceding assistant message's ToolUseBadges
      return null;
    }

    case 'permission_request':
      return (
        <PermissionRequestCard
          msg={msg as any}
          onResolve={handleResolvePermission}
        />
      );

    case 'system':
      return (msg as any).subtype === 'init' ? (
        <SystemInitCard msg={msg as any} />
      ) : null;

    case 'result':
      return <ResultCard msg={msg as any} />;

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

