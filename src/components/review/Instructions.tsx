import { useState } from "react";
import { Button } from "../ui/button";

interface InstructionsProps {
  instructions: string;
}

const Instructions = (props: InstructionsProps) => {
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  return (
    <div className="rounded-xl border px-2 sm:col-span-2">
      <span className="flex items-center justify-between">
        <span>Instructions</span>
        <Button onClick={() => setIsInstructionsOpen((prev) => !prev)}>
          {isInstructionsOpen ? "Hide" : "Show"}
        </Button>
      </span>
      {isInstructionsOpen && (
        <p className="whitespace-pre-wrap text-sm">
          {props.instructions || "No instructions provided."}
        </p>
      )}
    </div>
  );
};

export default Instructions;
