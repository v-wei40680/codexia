import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SimpleGitWorktreeSettings } from '../settings/GitWorktreeSettings';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/stores/settings';
import { Button } from '@/components/ui/button';
import { Github, Twitter } from 'lucide-react';

export function Introduce() {
  const {
    enableTaskCompleteBeep,
    setEnableTaskCompleteBeep,
    preventSleepDuringTasks,
    setPreventSleepDuringTasks,
  } = useSettingsStore();

  return (
    <Accordion type="single" collapsible className="w-full px-2 sm:px-4" defaultValue="item-2">
      <AccordionItem value="item-2">
        <AccordionTrigger className="text-sm sm:text-base">Task</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-3 sm:gap-4 text-balance">
          <SimpleGitWorktreeSettings />
          <div className="flex items-start justify-between gap-2 sm:gap-4 rounded-md border p-3 sm:p-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium">Task completion beep</p>
              <p className="text-xs text-muted-foreground">
                Play a short tone when tasks finish so you can focus away from the screen.
              </p>
            </div>
            <Switch
              checked={enableTaskCompleteBeep}
              onCheckedChange={setEnableTaskCompleteBeep}
              className="flex-shrink-0"
            />
          </div>
          <div className="flex items-start justify-between gap-2 sm:gap-4 rounded-md border p-3 sm:p-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium">Keep system awake</p>
              <p className="text-xs text-muted-foreground">
                Prevent the computer from sleeping while active tasks run to avoid interruptions.
              </p>
            </div>
            <Switch
              checked={preventSleepDuringTasks}
              onCheckedChange={setPreventSleepDuringTasks}
              className="flex-shrink-0"
            />
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger className="text-sm sm:text-base">
          Keep in touch and community
        </AccordionTrigger>
        <AccordionContent className="flex flex-wrap gap-2 text-balance">
          <Button
            onClick={() => open('https://github.com/milisp/codexia/discussions')}
            size="sm"
            className="flex-1 min-w-[120px]"
          >
            <Github className="h-4 w-4" />
            <span className="ml-2">Discussion</span>
          </Button>
          <Button
            onClick={() => open('https://github.com/milisp/codexia/issues')}
            size="sm"
            className="flex-1 min-w-[100px]"
          >
            <Github className="h-4 w-4" />
            <span className="ml-2">Bug</span>
          </Button>
          <Button
            onClick={() => open('https://discord.gg/zAjtD4kf5K')}
            size="sm"
            className="flex-shrink-0"
          >
            <img src="/discord.svg" height={16} width={16} alt="Discord" />
          </Button>
          <Button
            onClick={() => open('https://x.com/lisp_mi')}
            size="sm"
            className="flex-1 min-w-[100px]"
          >
            <Twitter className="h-4 w-4" />
            <span className="ml-2">lisp_mi</span>
          </Button>
          <Button
            onClick={() => open('https://www.reddit.com/r/codexia/')}
            size="sm"
            className="flex-1 min-w-[120px]"
          >
            <img src="/reddit.svg" height={16} width={16} alt="Reddit" />
            <span className="ml-2">r/codexia</span>
          </Button>
          <Button
            onClick={() => open('https://www.reddit.com/r/codex/')}
            size="sm"
            className="flex-1 min-w-[110px]"
          >
            <img src="/reddit.svg" height={16} width={16} alt="Reddit" />
            <span className="ml-2">r/codex</span>
          </Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
