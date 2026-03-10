import { CCMessageBlock } from '@/components/cc/messages/CCMessageBlock';
import type { AssistantMessage, ToolResultBlock, ToolUseBlock } from '../types/messages';
import { isToolUseBlock } from '../types/messages';
import { useCCStore } from '@/stores/ccStore';

interface Props {
  msg: AssistantMessage;
  index: number;
  isToolBlock: (b: { type: string }) => boolean;
  inlineErrors?: Record<string, ToolResultBlock>;
}

export function CCMessageContent({ msg, index, isToolBlock, inlineErrors }: Props) {
  const { messages } = useCCStore();

  const resolveToolName = (toolUseId: string): string | undefined => {
    const inMsg = msg.message.content.find(
      (b): b is ToolUseBlock => b.type === 'tool_use' && b.id === toolUseId,
    );
    if (inMsg) return inMsg.name;
    for (const m of messages) {
      if (m.type !== 'assistant') continue;
      const found = m.message.content.find(
        (b): b is ToolUseBlock => b.type === 'tool_use' && b.id === toolUseId,
      );
      if (found) return found.name;
    }
  };

  const blocks = msg.message.content;

  return (
    <div className="flex flex-col">
      {msg.message.error && (
        <div className="text-xs text-red-500 px-1 mb-2">
          Error: {msg.message.error}
        </div>
      )}
      {blocks.map((block, i) => {
        const prev = blocks[i - 1];
        const mt =
          i === 0
            ? ''
            : isToolBlock(block) && prev && isToolBlock(prev)
              ? 'mt-0.5'
              : 'mt-2';

        const inlineError = isToolUseBlock(block)
          ? inlineErrors?.[block.id] ?? null
          : null;

        return (
          <div key={`${index}-${i}`} className={mt}>
            <CCMessageBlock
              block={block}
              index={i}
              inlineError={inlineError}
              toolName={
                block.type === 'tool_use'
                  ? block.name
                  : block.type === 'tool_result'
                    ? resolveToolName(block.tool_use_id)
                    : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}

