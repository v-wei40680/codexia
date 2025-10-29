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
    >
      <AccordionItem value="item-1">
        <AccordionTrigger className="bg-gray-200 dark:bg-gray-700 px-2 py-2">{title}</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2 text-balance">
          <MarkdownRenderer content={content} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
  