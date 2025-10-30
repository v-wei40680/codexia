import React from "react";

export interface RoleMessageProps {
  content: string;
  role: string;
}

const RoleMessage: React.FC<RoleMessageProps> = (props) => (
  <article className="ml-auto flex w-full max-w-[95%] flex-col gap-2 rounded-xl border px-4 py-2 text-sm shadow-lg backdrop-blur md:max-w-[80%]">
    <p className="whitespace-pre-wrap leading-relaxed">{props.content}</p>
  </article>
);

export default RoleMessage;
