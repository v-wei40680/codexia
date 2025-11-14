import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "../ui/button";
import { open } from "@tauri-apps/plugin-shell";
import { ExternalLink, Github, Twitter } from "lucide-react";
import { SimpleGitWorktreeSettings } from "../settings/GitWorktreeSettings";
import { Link } from "react-router-dom";
import { Switch } from "../ui/switch";
import { useSettingsStore } from "@/stores/settings/SettingsStore";
import { useTranslation } from "react-i18next";
import { invoke } from "@/lib/tauri-proxy";

export function Introduce() {
  const {
    enableTaskCompleteBeep,
    setEnableTaskCompleteBeep,
    preventSleepDuringTasks,
    setPreventSleepDuringTasks,
  } = useSettingsStore();
  const { t } = useTranslation();

  const handleNewWindow = async () => {
    try {
      await invoke("create_new_window");
    } catch (error) {
      console.error("Failed to create new window:", error);
    }
  };

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
          <div className="flex justify-between">
            <Button
              onClick={handleNewWindow}
              title={t("header.openNewWindow")}
            >
              <ExternalLink /> {t("header.openNewWindow")}
            </Button>
            <Link
              to="/settings"
              className="flex hover:text-primary items-center justify-end"
            >
              More Settings
            </Link>
          </div>
          <SimpleGitWorktreeSettings />
          <div className="flex items-start justify-between gap-4 rounded-md border p-4">
            <div>
              <p className="text-sm font-medium">Task completion beep</p>
              <p className="text-xs text-muted-foreground">
                Play a short tone when tasks finish so you can focus away from the screen.
              </p>
            </div>
            <Switch
              checked={enableTaskCompleteBeep}
              onCheckedChange={setEnableTaskCompleteBeep}
            />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-md border p-4">
            <div>
              <p className="text-sm font-medium">Keep system awake</p>
              <p className="text-xs text-muted-foreground">
                Prevent the computer from sleeping while active tasks run to avoid interruptions.
              </p>
            </div>
            <Switch
              checked={preventSleepDuringTasks}
              onCheckedChange={setPreventSleepDuringTasks}
            />
          </div>
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
