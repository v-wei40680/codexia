import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SimpleMarkdown } from "../common/SimpleMarkdown";

interface AccordionMsgProps {
  title: string;
  content: string;
}

export function AccordionMsg({ title, content }: AccordionMsgProps) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger className="p-0">
          <SimpleMarkdown content={title} />
        </AccordionTrigger>
        <AccordionContent>
          <SimpleMarkdown content={content} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
