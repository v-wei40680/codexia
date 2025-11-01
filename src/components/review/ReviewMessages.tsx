import { renderMessage } from "./renderMessage";
import EmptyState from "./EmptyState";
import { Badge } from "../ui/badge";

interface ReviewMessagesProps {
  messages: any[];
  isSessionLoading: boolean;
  hasSelection: boolean;
  hasMessages: boolean;
}

export default function ReviewMessages({
  messages,
  isSessionLoading,
  hasSelection,
  hasMessages,
}: ReviewMessagesProps) {
  return (
    <section
      className="rounded-2xl border p-4 shadow-lg overflow-y-auto flex-1 min-h-0 relative"
    >
      {hasMessages ? (
        <ul className="flex flex-col gap-3 pb-12">
          {messages.map((msg) => (
            <div key={msg.id} className="group flex flex-col gap-1">
              <li className="flex">{renderMessage(msg)}</li>

              <div
                className={`
                  flex
                  ${msg.type === "user_message" ? "justify-end" : "justify-start"}
                  hidden group-hover:flex
                  transition-opacity duration-200
                `}
              >
                <Badge className="opacity-100">{msg.type}</Badge>
              </div>
            </div>
          ))}
        </ul>
      ) : (
        <EmptyState
          isSessionLoading={isSessionLoading}
          hasSelection={hasSelection}
        />
      )}
    </section>
  );
}
