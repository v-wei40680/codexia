import { Badge } from "../ui/badge";
import { CCContentBlock } from "@/stores/ccStore";

interface Props {
  block: CCContentBlock;
  index: number;
}

export function CCMessageBlock({ block, index }: Props) {
  const blockKey = `block-${index}`;

  switch (block.type) {
    case "text":
      return (
        <div key={blockKey} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="text-xs font-semibold text-gray-900 mb-2">ASSISTANT</div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{block.text}</div>
        </div>
      );

    case "thinking":
      return (
        <div key={blockKey} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-xs font-semibold text-amber-900 mb-2">THINKING</div>
          <div className="text-sm text-amber-900 whitespace-pre-wrap">{block.thinking}</div>
        </div>
      );

    case "tool_use":
      return (
        <div key={blockKey} className="rounded-lg border border-purple-200 bg-purple-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs font-semibold text-purple-900">TOOL USE</div>
            <Badge variant="outline" className="text-xs">
              {block.name}
            </Badge>
            {["Read", "Edit", "Write"].includes(block.name || "") && (
              <Badge variant="outline" className="text-xs">
                {block.input?.file_path}
              </Badge>
            )}
            {block.name === "Read" && (
              <>
                {block.input?.offset && (
                  <Badge variant="outline" className="text-xs">
                    offset: {block.input.offset}
                  </Badge>
                )}
                {block.input?.limit && (
                  <Badge variant="outline" className="text-xs">
                    limit: {block.input.limit}
                  </Badge>
                )}
              </>
            )}
            {block.name === "Glob" && block.input?.pattern && (
              <Badge variant="outline" className="text-xs">
                {block.input.pattern}
              </Badge>
            )}
            {block.name === "TodoWrite" && (
              <Badge variant="secondary" className="text-xs">
                Tasks
              </Badge>
            )}
          </div>

          {/* Show full input for non-file tools */}
          {!["Read", "Edit", "Glob", "Write"].includes(block.name || "") && (
            <pre className="text-sm overflow-auto bg-white rounded border p-2 max-h-60">
              <code>{JSON.stringify(block.input, null, 2)}</code>
            </pre>
          )}

          {/* Special rendering for Edit */}
          {block.name === "Edit" && (
            <div className="space-y-2">
              <div>
                <div className="text-xs text-gray-600 mb-1">Old:</div>
                <pre className="text-sm overflow-auto bg-white rounded border p-2 max-h-40">
                  <code>{block.input?.old_string}</code>
                </pre>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">New:</div>
                <pre className="text-sm overflow-auto bg-white rounded border p-2 max-h-40">
                  <code>{block.input?.new_string}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Special rendering for Write */}
          {block.name === "Write" && block.input?.content && (
            <pre className="text-sm overflow-auto bg-white rounded border p-2 max-h-60">
              <code>{block.input.content}</code>
            </pre>
          )}
        </div>
      );

    case "tool_result":
      return (
        <div
          key={blockKey}
          className={`rounded-lg border p-3 ${
            block.is_error
              ? "border-red-200 bg-red-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <div
            className={`text-xs font-semibold mb-2 ${
              block.is_error ? "text-red-900" : "text-green-900"
            }`}
          >
            TOOL RESULT {block.is_error && "(ERROR)"}
          </div>
          <pre className="text-sm overflow-auto max-h-60">
            <code>{JSON.stringify(block.content, null, 2)}</code>
          </pre>
        </div>
      );

    default:
      return (
        <div key={blockKey} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <pre className="text-sm overflow-auto">
            <code>{JSON.stringify(block, null, 2)}</code>
          </pre>
        </div>
      );
  }
}
