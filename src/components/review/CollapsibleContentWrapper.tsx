import React, { useMemo } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

export const CollapsibleContentWrapper: React.FC<{ content: string }> = ({
  content,
}) => {
  const hasMultipleLines = useMemo(() => content.includes("\n"), [content]);

  if (!hasMultipleLines) {
    return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center">
        <h3 className="whitespace-pre-wrap leading-relaxed">
          {content.split("\n")[0]}
        </h3>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="whitespace-pre-wrap leading-relaxed">
          {content.split("\n").slice(2).join("\n")}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
};
