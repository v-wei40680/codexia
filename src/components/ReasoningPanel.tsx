import { Lightbulb } from "lucide-react";
import { EventBubble } from "./events/EventBubble";

const ReasoningPanel = ({ sections }: { sections: any[] }) => (
  <div className="space-y-3">
    {sections.map((section, index) => (
      <EventBubble
        key={section.id || index}
        align="start"
        variant="system"
        title="Reasoning"
      >
        <div className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
          <div className="whitespace-pre-wrap wrap-break-word text-sm">
            {section.content}
            {section.isStreaming && (
              <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-current" />
            )}
          </div>
        </div>
      </EventBubble>
    ))}
  </div>
);

export default ReasoningPanel;
