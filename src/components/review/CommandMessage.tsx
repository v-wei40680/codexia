import React from "react";
import { Terminal } from "lucide-react";

export interface CommandMessageProps {
  content: string;
  variant?: string;
}

const CommandMessage: React.FC<CommandMessageProps> = (props) => (
  <article className="mr-auto flex w-full max-w-[95%] flex-col gap-2 text-sm backdrop-blur md:max-w-[80%]">
    <span className="flex gap-2">
      <Terminal />
      <p className="border rounded px-2">{props.content}</p>
    </span>
  </article>
);

export default CommandMessage;
