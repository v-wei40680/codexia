import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DiffViewer } from "../filetree/DiffViewer";

interface TurnDiffViewProps {
  content: string;
}

function getDiffName(diffHeader: string) {
  const regex = /diff --git a\/(.*?) b\/(.*?)\s/;

  const match = diffHeader.match(regex);

  let filename = null;

  if (match && match.length >= 2) {
    filename = match[1];
  }

  console.log(filename);

  const newFileRegex = /b\/(.*?)\s/;
  const newFileMatch = diffHeader.match(newFileRegex);

  let newFilename = null;
  if (newFileMatch && newFileMatch.length >= 2) {
    newFilename = newFileMatch[1];
  }
  return newFilename;
}

export function TurnDiffView({ content }: TurnDiffViewProps) {
  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger className="bg-gray-200 px-2">{getDiffName(content)}</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <DiffViewer unifiedDiff={content} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
