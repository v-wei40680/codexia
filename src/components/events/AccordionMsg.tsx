import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarkdownRenderer } from "../chat/MarkdownRenderer";

interface AccordionMsgProps {
  title: string;
  content: string;
}

export function AccordionMsg({ title, content }: AccordionMsgProps) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger className="px-2 py-2">
          <MarkdownRenderer content={title} />
        </AccordionTrigger>
        <AccordionContent className="flex flex-col px-2">
          <MarkdownRenderer content={content} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
