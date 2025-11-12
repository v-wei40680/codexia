import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "../ui/button";
import { open } from "@tauri-apps/plugin-shell";
import { Github, Twitter } from "lucide-react";
import { SimpleGitWorktreeSettings } from "../settings/GitWorktreeSettings";
import { Link } from "react-router-dom";

export function Introduce() {
  return (
    <Accordion
      type="single"
      collapsible
      className="w-full px-4"
      defaultValue="item-1"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>Settings</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <Link
            to="/settings"
            className="flex hover:text-primary items-center justify-end"
          >
            More Settings
          </Link>
          <SimpleGitWorktreeSettings />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Keep in touch</AccordionTrigger>
        <AccordionContent className="flex gap-4 text-balance">
          <Button onClick={() => open("https://github.com/milisp/codexia/discussions")}><Github />Github</Button>
          <Button onClick={() => open("https://discord.gg/zAjtD4kf5K")}><img src="/discord.svg" height={24} width={24}/>Discord</Button>
          <Button onClick={() => open("https://x.com/lisp_mi")}><Twitter />milisp</Button>
          <Button onClick={() => open("https://www.reddit.com/r/codexia/")}><img src="/reddit.svg" height={24} width={24}/>r/codexia</Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
