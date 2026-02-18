import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { AutomationSchedule, AutomationTask, AutomationWeekday } from '@/services/tauri';
import {
  createAutomation,
  deleteAutomation,
  listAutomations,
  setAutomationPaused,
} from '@/services/tauri';
import { toast } from '@/components/ui/use-toast';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { getFilename } from '@/utils/getFilename';
import { getErrorMessage } from '@/utils/errorUtils';

type ViewTask = AutomationTask & { isTemplate?: boolean };

const WEEKDAY_OPTIONS: Array<{ label: string; value: AutomationWeekday }> = [
  { label: 'Sun', value: 'sun' },
  { label: 'Mon', value: 'mon' },
  { label: 'Tue', value: 'tue' },
  { label: 'Wed', value: 'wed' },
  { label: 'Thu', value: 'thu' },
  { label: 'Fri', value: 'fri' },
  { label: 'Sat', value: 'sat' },
];

const DEFAULT_WEEKDAYS: AutomationWeekday[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

const DEFAULT_TEMPLATE_TASK: ViewTask = {
  id: 'template-daily-bug-scan',
  name: 'Daily bug scan',
  projects: [],
  prompt:
    'Run a focused bug scan for high-risk regressions, then report findings with file paths and severity.',
  access_mode: 'agent',
  schedule: {
    mode: 'daily',
    hour: 9,
    interval_hours: null,
    weekdays: DEFAULT_WEEKDAYS,
  },
  cron_expression: '0 0 9 * * MON,TUE,WED,THU,FRI',
  created_at: new Date().toISOString(),
  paused: false,
  isTemplate: true,
};

function normalizeWeekdays(value: string[]): AutomationWeekday[] {
  return value
    .map((item) => item.toLowerCase())
    .filter((item): item is AutomationWeekday =>
      ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].includes(item)
    );
}

export function AutoMateView() {
  const { projects } = useWorkspaceStore();
  const [tasks, setTasks] = useState<ViewTask[]>([DEFAULT_TEMPLATE_TASK]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ViewTask | null>(null);
  const [name, setName] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'daily' | 'interval'>('daily');
  const [dailyHour, setDailyHour] = useState(9);
  const [intervalHours, setIntervalHours] = useState(6);
  const [weekdays, setWeekdays] = useState<AutomationWeekday[]>(DEFAULT_WEEKDAYS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMutatingTask, setIsMutatingTask] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const isCreateMode = selectedTask === null;
  const canCreate = useMemo(
    () => name.trim().length > 0 && prompt.trim().length > 0 && weekdays.length > 0,
    [name, prompt, weekdays.length]
  );

  const resetForm = () => {
    setName('');
    setSelectedProjects([]);
    setPrompt('');
    setScheduleMode('daily');
    setDailyHour(9);
    setIntervalHours(6);
    setWeekdays(DEFAULT_WEEKDAYS);
  };

  const fillFormFromTask = (task: ViewTask) => {
    setName(task.name);
    setSelectedProjects(task.projects);
    setPrompt(task.prompt);
    setScheduleMode(task.schedule.mode);
    setDailyHour(task.schedule.hour ?? 9);
    setIntervalHours(task.schedule.interval_hours ?? 6);
    setWeekdays(normalizeWeekdays(task.schedule.weekdays));
  };

  const toggleProject = (project: string) => {
    setSelectedProjects((current) =>
      current.includes(project) ? current.filter((item) => item !== project) : [...current, project]
    );
  };

  const toggleWeekday = (weekday: AutomationWeekday) => {
    setWeekdays((current) =>
      current.includes(weekday) ? current.filter((item) => item !== weekday) : [...current, weekday]
    );
  };

  const loadAutomations = async () => {
    setIsLoading(true);
    try {
      const data = await listAutomations();
      setTasks(data.length > 0 ? data : [DEFAULT_TEMPLATE_TASK]);
    } catch (error) {
      const message = getErrorMessage(error);
      toast({ title: 'Load failed', description: message, variant: 'destructive' });
      setTasks([DEFAULT_TEMPLATE_TASK]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAutomations();
  }, []);

  const openCreateDialog = () => {
    setSelectedTask(null);
    setLastError(null);
    resetForm();
    setDialogOpen(true);
  };

  const openTaskDialog = (task: ViewTask) => {
    setSelectedTask(task);
    setLastError(null);
    fillFormFromTask(task);
    setDialogOpen(true);
  };

  const handleCreateAutomation = async () => {
    if (!canCreate) return;
    setIsSubmitting(true);
    setLastError(null);
    try {
      const schedule: AutomationSchedule =
        scheduleMode === 'daily'
          ? { mode: 'daily', hour: dailyHour, interval_hours: null, weekdays }
          : { mode: 'interval', hour: null, interval_hours: intervalHours, weekdays };

      const nextTask = await createAutomation({
        name: name.trim(),
        projects: selectedProjects,
        prompt: prompt.trim(),
        schedule,
        access_mode: 'agent',
      });

      setTasks((current) => [nextTask, ...current.filter((task) => task.id !== DEFAULT_TEMPLATE_TASK.id)]);
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      const message = getErrorMessage(error);
      setLastError(message);
      toast({ title: 'Create failed', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePaused = async () => {
    if (!selectedTask || selectedTask.isTemplate) return;
    setIsMutatingTask(true);
    setLastError(null);
    try {
      const updated = await setAutomationPaused(selectedTask.id, !selectedTask.paused);
      setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
      setSelectedTask(updated);
      fillFormFromTask(updated);
    } catch (error) {
      const message = getErrorMessage(error);
      setLastError(message);
      toast({ title: 'Update failed', description: message, variant: 'destructive' });
    } finally {
      setIsMutatingTask(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTask || selectedTask.isTemplate) return;
    setIsMutatingTask(true);
    setLastError(null);
    try {
      await deleteAutomation(selectedTask.id);
      setTasks((current) => current.filter((task) => task.id !== selectedTask.id));
      setDialogOpen(false);
      setSelectedTask(null);
      resetForm();
    } catch (error) {
      const message = getErrorMessage(error);
      setLastError(message);
      toast({ title: 'Delete failed', description: message, variant: 'destructive' });
    } finally {
      setIsMutatingTask(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Automations</h1>
            <p className="text-sm text-muted-foreground">Click a card to manage pause/delete.</p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            New automation
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">Loading automations...</CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card
                key={task.id}
                className="cursor-pointer transition-colors hover:bg-accent/30"
                onClick={() => openTaskDialog(task)}
              >
                <CardHeader className="py-4">
                  <CardTitle className="text-base">{task.name}</CardTitle>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedTask(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreateMode ? 'Create automation' : selectedTask?.name}</DialogTitle>
            <DialogDescription>
              {isCreateMode ? 'Create a new automation task.' : 'Manage this automation task.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {lastError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {lastError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="automation-name">Name</Label>
              <Input
                id="automation-name"
                placeholder="Nightly dependency audit"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={!isCreateMode}
              />
            </div>

            <div className="space-y-2">
              <Label>Workspace projects</Label>
              <ScrollArea className="h-32 rounded-md border">
                <div className="space-y-1 p-2">
                  {projects.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-muted-foreground">
                      No workspace projects found. Add projects from the sidebar first.
                    </p>
                  ) : (
                    projects.map((project) => (
                      <div
                        key={project}
                        role="button"
                        tabIndex={isCreateMode ? 0 : -1}
                        className={`flex h-9 w-full items-center justify-start gap-2 rounded-md px-2 ${
                          isCreateMode ? 'cursor-pointer hover:bg-accent/50' : 'cursor-not-allowed opacity-70'
                        }`}
                        onClick={() => {
                          if (!isCreateMode) return;
                          toggleProject(project);
                        }}
                        onKeyDown={(event) => {
                          if (!isCreateMode) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleProject(project);
                          }
                        }}
                      >
                        <Checkbox
                          checked={selectedProjects.includes(project)}
                          onCheckedChange={() => isCreateMode && toggleProject(project)}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <span className="truncate text-left">{getFilename(project) || project}</span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label htmlFor="automation-prompt">Prompt</Label>
              <Textarea
                id="automation-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="min-h-24"
                disabled={!isCreateMode}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Schedule</Label>
                <Tabs
                  value={scheduleMode}
                  onValueChange={(value) => isCreateMode && setScheduleMode(value as 'daily' | 'interval')}
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="daily" className="text-xs" disabled={!isCreateMode}>
                      daily
                    </TabsTrigger>
                    <TabsTrigger value="interval" className="text-xs" disabled={!isCreateMode}>
                      interval
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <Tabs value={scheduleMode}>
                <TabsContent value="daily" className="mt-0">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="daily-hour">At hour</Label>
                      <Input
                        id="daily-hour"
                        type="number"
                        min={0}
                        max={23}
                        value={dailyHour}
                        onChange={(event) => setDailyHour(Number(event.target.value))}
                        disabled={!isCreateMode}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Weekdays</Label>
                      <div className="grid grid-cols-4 gap-2 rounded-md border p-2">
                        {WEEKDAY_OPTIONS.map((weekday) => (
                          <Button
                            key={weekday.value}
                            variant={weekdays.includes(weekday.value) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => isCreateMode && toggleWeekday(weekday.value)}
                            className="h-7 text-xs"
                            disabled={!isCreateMode}
                          >
                            {weekday.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="interval" className="mt-0">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="interval-hours">Run every n hours</Label>
                      <Input
                        id="interval-hours"
                        type="number"
                        min={1}
                        max={24}
                        value={intervalHours}
                        onChange={(event) => setIntervalHours(Number(event.target.value))}
                        disabled={!isCreateMode}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Weekdays</Label>
                      <div className="grid grid-cols-4 gap-2 rounded-md border p-2">
                        {WEEKDAY_OPTIONS.map((weekday) => (
                          <Button
                            key={weekday.value}
                            variant={weekdays.includes(weekday.value) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => isCreateMode && toggleWeekday(weekday.value)}
                            className="h-7 text-xs"
                            disabled={!isCreateMode}
                          >
                            {weekday.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter>
            {isCreateMode ? (
              <>
                <Button variant="ghost" disabled={isSubmitting} onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void handleCreateAutomation()} disabled={!canCreate || isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add task'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="destructive" disabled={isMutatingTask || selectedTask?.isTemplate} onClick={() => void handleDelete()}>
                  Delete
                </Button>
                <Button variant="outline" disabled={isMutatingTask || selectedTask?.isTemplate} onClick={() => void handleTogglePaused()}>
                  {selectedTask?.paused ? 'Resume' : 'Pause'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
