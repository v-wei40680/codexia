import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Markdown } from '../../Markdown';

interface AccordionMsgProps {
  title: string;
  content: string;
}

export function AccordionMsg({ title, content }: AccordionMsgProps) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger className="p-0">
          <Markdown value={title} />
        </AccordionTrigger>
        <AccordionContent>
          <Markdown value={content} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
