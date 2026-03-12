import { CCMessageBlock } from '@/components/cc/messages/CCMessageBlock';
import { ExploredGroup } from '@/components/cc/messages/ExploredGroup';
import type { AssistantMessage, ContentBlock, ToolResultBlock, ToolUseBlock } from '../types/messages';
import { useCCStore } from '@/stores/ccStore';

const SILENT_TOOLS = new Set(['Read', 'Glob', 'Grep']);

interface Props {
  msg: AssistantMessage;
  index?: number;
  isToolBlock: (b: { type: string }) => boolean;
  inlineErrors?: Record<string, ToolResultBlock>;
}

type RenderItem =
  | {
    kind: 'single';
    block: ContentBlock;
    blockIndex: number;
    inlineError: ToolResultBlock | null;
    mt: string;
  }
  | {
    kind: 'explored';
    items: Array<{ block: ToolUseBlock; inlineError: ToolResultBlock | null }>;
    mt: string;
    isLocallyCompleted: boolean;
  };

function buildRenderItems(
  blocks: ContentBlock[],
  isToolBlock: (b: { type: string }) => boolean,
  inlineErrors?: Record<string, ToolResultBlock>,
): RenderItem[] {
  const result: RenderItem[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];
    const prevBlock = i > 0 ? blocks[i - 1] : null;
    const mt =
      i === 0
        ? ''
        : isToolBlock(block) && prevBlock && isToolBlock(prevBlock)
          ? 'mt-0.5'
          : 'mt-2';

    if (block.type === 'tool_use' && SILENT_TOOLS.has(block.name)) {
      // Collect consecutive SILENT_TOOL tool_use blocks into one ExploredGroup.
      const groupItems: Array<{ block: ToolUseBlock; inlineError: ToolResultBlock | null }> = [];
      while (
        i < blocks.length &&
        blocks[i].type === 'tool_use' &&
        SILENT_TOOLS.has((blocks[i] as ToolUseBlock).name)
      ) {
        const b = blocks[i] as ToolUseBlock;
        groupItems.push({ block: b, inlineError: inlineErrors?.[b.id] ?? null });
        i++;
      }
      // If any block follows the group in this message, exploration phase is over.
      const isLocallyCompleted = i < blocks.length;
      result.push({ kind: 'explored', items: groupItems, mt, isLocallyCompleted });
    } else {
      const inlineError = block.type === 'tool_use' ? inlineErrors?.[block.id] ?? null : null;
      result.push({ kind: 'single', block, blockIndex: i, inlineError, mt });
      i++;
    }
  }

  return result;
}

export function CCMessageContent({ msg, isToolBlock, inlineErrors }: Props) {
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

  // inlineErrors !== undefined means the next user message with tool_results has arrived.
  const isCompleted = inlineErrors !== undefined;

  const renderItems = buildRenderItems(msg.message.content, isToolBlock, inlineErrors);

  return (
    <div className="flex flex-col">
      {msg.message.error && (
        <div className="text-xs text-red-500 px-1 mb-2">
          Error: {msg.message.error}
        </div>
      )}
      {renderItems.map((item, gi) => (
        <div key={gi} className={item.mt}>
          {item.kind === 'explored' ? (
            <ExploredGroup items={item.items} isCompleted={isCompleted || item.isLocallyCompleted} />
          ) : (
            <CCMessageBlock
              block={item.block}
              index={item.blockIndex}
              inlineError={item.inlineError}
              toolName={
                item.block.type === 'tool_use'
                  ? item.block.name
                  : item.block.type === 'tool_result'
                    ? resolveToolName(item.block.tool_use_id)
                    : undefined
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}
