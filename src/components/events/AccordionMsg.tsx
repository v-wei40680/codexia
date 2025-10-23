import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { MarkdownRenderer } from "../chat/MarkdownRenderer";
  
interface AccordionMsgProps {
  title: string;
  content: string;
}

export function AccordionMsg({
  title,
  content
}: AccordionMsgProps) {
  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
      defaultValue="item-1"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>{title}</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <MarkdownRenderer content={content} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
  