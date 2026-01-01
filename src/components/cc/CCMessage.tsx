import { useState } from "react";
import type { CCMessage as CCMessageType } from "@/types/cc-messages";
import { Card } from "@/components/ui/card";
import { CCMessageBlock } from "@/components/cc/CCMessageBlock";

interface CCMessageProps {
  message: CCMessageType;
  index: number;
}

export function CCMessage({ message: msg, index: idx }: CCMessageProps) {
  switch (msg.type) {
    case "assistant":
      return (
        <div className="space-y-2">
          {msg.message.error && (
            <Card className="p-3 bg-red-50 dark:bg-red-950 border-red-200">
              <div className="text-xs font-semibold mb-1 text-red-900 dark:text-red-100">
                Error: {msg.message.error}
              </div>
            </Card>
          )}
          {msg.message.content.map((block, blockIdx) => (
            <CCMessageBlock key={`${idx}-${blockIdx}`} block={block} index={blockIdx} />
          ))}
        </div>
      );

    case "user": {
      // Support multiple formats: text, content, or legacy message.content
      const userContent = msg.text
        ? msg.text
        : msg.message?.content
          ? (typeof msg.message.content === "string" ? msg.message.content : null)
          : null;
      const userBlocks = msg.content
        ? msg.content
        : (msg.message?.content && Array.isArray(msg.message.content) ? msg.message.content : null);

      return (
        <Card className="p-3 bg-blue-50 dark:bg-blue-950">
          <div className="text-xs font-semibold mb-1 text-muted-foreground">You</div>
          {userContent ? (
            <div className="whitespace-pre-wrap">{userContent}</div>
          ) : userBlocks ? (
            <div className="space-y-2">
              {userBlocks.map((block, blockIdx) => (
                <CCMessageBlock key={`${idx}-user-${blockIdx}`} block={block} index={blockIdx} />
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Empty message</div>
          )}
        </Card>
      );
    }

    case "system": {
      if (msg.subtype === "init") {
        const [showTools, setShowTools] = useState(false);

        return (
          <Card className="p-2 bg-slate-50 dark:bg-slate-900">
            <div className="text-xs text-muted-foreground">
              Session initialized: {msg.session_id}
              {msg.tools && (
                <span>
                  {" | "}
                  <button
                    onClick={() => setShowTools(!showTools)}
                    className="underline hover:text-foreground cursor-pointer"
                  >
                    {msg.tools.length} tools
                  </button>
                </span>
              )}
              {msg.model && ` | Model: ${msg.model}`}
            </div>
            {showTools && msg.tools && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="text-xs font-semibold mb-1 text-muted-foreground">Available Tools:</div>
                <div className="flex flex-wrap gap-1">
                  {msg.tools.map((tool, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      }
      return null;
    }

    case "result":
      return (
        <Card className="p-3 bg-green-50 dark:bg-green-950">
          <div className="text-xs font-semibold mb-1 text-green-900 dark:text-green-100">
            Result
          </div>
          <div className="text-xs space-y-1 text-green-800 dark:text-green-200">
            <div>Duration: {msg.duration_ms}ms ({(msg.duration_ms / 1000).toFixed(2)}s)</div>
            <div>Turns: {msg.num_turns}</div>
            {msg.total_cost_usd && <div>Cost: ${msg.total_cost_usd.toFixed(4)}</div>}
            {msg.is_error && <div className="text-red-600">Error occurred</div>}
            {msg.result && (
              <div className="mt-2 whitespace-pre-wrap">{msg.result}</div>
            )}
            {msg.structured_output && (
              <div className="mt-2">
                <div className="font-semibold mb-1">Structured Output:</div>
                <pre className="overflow-auto bg-white dark:bg-gray-800 rounded p-2 text-xs">
                  <code>{JSON.stringify(msg.structured_output, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        </Card>
      );

    case "stream_event":
      return null;

    default:
      return (
        <Card className="p-3">
          <pre className="text-xs overflow-auto">
            <code>{JSON.stringify(msg, null, 2)}</code>
          </pre>
        </Card>
      );
  }
}
