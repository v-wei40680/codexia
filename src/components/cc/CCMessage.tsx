import { CCMessage as CCMessageType } from "@/stores/ccStore";
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
          {msg.message.content.map((block, blockIdx) => (
            <CCMessageBlock key={`${idx}-${blockIdx}`} block={block} index={blockIdx} />
          ))}
        </div>
      );

    case "user":
      return (
        <Card className="p-3 bg-blue-50 dark:bg-blue-950">
          <div className="text-xs font-semibold mb-1 text-muted-foreground">You</div>
          <div className="whitespace-pre-wrap">{msg.text}</div>
        </Card>
      );

    case "system":
      if (msg.subtype === "init") {
        return (
          <Card className="p-2 bg-slate-50 dark:bg-slate-900">
            <div className="text-xs text-muted-foreground">
              Session initialized: {msg.session_id}
              {msg.tools && ` | ${msg.tools.length} tools available`}
              {msg.model && ` | Model: ${msg.model}`}
            </div>
          </Card>
        );
      }
      return null;

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
