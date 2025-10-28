import { EventBubble } from "./events/EventBubble";

const MessageList = ({ messages }: { messages: any[] }) => (
  <div className="space-y-4">
    {messages.map((msg, index) => (
      <EventBubble
        key={msg.id || index}
        align={msg.role === "user" ? "end" : "start"}
        variant={msg.role === "user" ? "user" : "assistant"}
        title={msg.role === "user" ? "You" : "Assistant"}
      >
        <div className="whitespace-pre-wrap wrap-break-word">{msg.content}</div>
        {msg.images && msg.images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {msg.images.map((img: string, i: number) => (
              <img key={i} src={img} alt="" className="max-w-xs rounded" />
            ))}
          </div>
        )}
        {msg.isStreaming && (
          <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-current" />
        )}
      </EventBubble>
    ))}
  </div>
);

export default MessageList;
