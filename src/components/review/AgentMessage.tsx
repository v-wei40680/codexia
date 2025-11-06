import React from "react";
import { AccordionMsg } from "../events/AccordionMsg";

export interface AgentMessageProps {
  content: string;
  variant?: string;
  type?: string;
}

const AgentMessage: React.FC<AgentMessageProps> = (props) => (
  <article className="mr-auto flex w-full max-w-[95%] flex-col gap-2 text-sm backdrop-blur md:max-w-[80%]">
    <span className="flex gap-2">
      <AccordionMsg
        content={props.content}
        title={props.content.slice(0, 50)}
      />
    </span>
  </article>
);

export default AgentMessage;
