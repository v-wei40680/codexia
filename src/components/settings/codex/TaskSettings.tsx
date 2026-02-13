import { Switch } from '@/components/ui/switch';
import { useSettingsStore, type TaskCompleteBeepMode, type TaskDetail } from '@/stores/settings';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Github, Twitter } from 'lucide-react';

export function TaskSettings() {
  const {
    enableTaskCompleteBeep,
    setEnableTaskCompleteBeep,
    preventSleepDuringTasks,
    setPreventSleepDuringTasks,
    taskDetail,
    setTaskDetail,
  } = useSettingsStore();
  const handleTaskDetailChange = (value: string) => setTaskDetail(value as TaskDetail);
  const handleTaskCompleteBeepChange = (value: string) =>
    setEnableTaskCompleteBeep(value as TaskCompleteBeepMode);

  return (
    <div className="w-full px-2 sm:px-4 space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm sm:text-base font-medium">Task</h3>
        <div className="flex flex-col gap-3 sm:gap-4 text-balance">
          <div className="flex items-center justify-between gap-3 rounded-md border p-3 sm:p-4">
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm font-medium">Task detail</p>
              <p className="text-xs text-muted-foreground">
                Choose how much command output to show in tasks.
              </p>
            </div>
            <Select defaultValue={taskDetail} onValueChange={handleTaskDetailChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="steps">Steps</SelectItem>
                <SelectItem value="stepsWithCommand">Steps with code commands</SelectItem>
                <SelectItem value="stepsWithOutput">Steps with code output</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start justify-between gap-2 sm:gap-4 rounded-md border p-3 sm:p-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium">Task completion beep</p>
              <p className="text-xs text-muted-foreground">
                Play a short tone when tasks finish so you can focus away from the screen.
              </p>
            </div>
            <Select value={enableTaskCompleteBeep} onValueChange={handleTaskCompleteBeepChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="unfocused">Only when unfocused</SelectItem>
                <SelectItem value="always">Always</SelectItem>
              </SelectContent>
            </Select>
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
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm sm:text-base font-medium">Keep in touch and community</h3>
        <div className="flex flex-wrap gap-2 text-balance">
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
        </div>
      </section>
    </div>
  );
}
