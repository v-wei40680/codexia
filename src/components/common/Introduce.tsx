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
import { useSettingsStore } from "@/stores/settings";
import { useTranslation } from "react-i18next";
import { CodexAuth } from "@/components/settings";
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
      className="w-full px-2 sm:px-4"
      defaultValue="item-2"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger className="text-sm sm:text-base">ChatGPT Auth</AccordionTrigger>
        <AccordionContent>
          <CodexAuth />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger className="text-sm sm:text-base">Settings</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-3 sm:gap-4 text-balance">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <span className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <Button onClick={handleNewWindow} title={t("header.openNewWindow")} size="sm" className="justify-center sm:justify-start">
                <ExternalLink className="h-4 w-4" />
                <span className="ml-2">{t("header.openNewWindow")}</span>
              </Button>
              <Link
                to="/login"
                className="flex hover:text-primary items-center justify-center sm:justify-end"
              >
                <Button size="sm" className="w-full sm:w-auto">Codexia login</Button>
              </Link>
              <Link
                to="/donate"
                className="flex hover:text-primary items-center justify-center sm:justify-end"
              >
                <Button size="sm" className="w-full sm:w-auto">{t("header.donate")}</Button>
              </Link>
            </span>
            <Link
              to="/settings"
              className="flex hover:text-primary items-center justify-center sm:justify-end text-sm"
            >
              More Settings
            </Link>
          </div>
          <SimpleGitWorktreeSettings />
          <div className="flex items-start justify-between gap-2 sm:gap-4 rounded-md border p-3 sm:p-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium">Task completion beep</p>
              <p className="text-xs text-muted-foreground">
                Play a short tone when tasks finish so you can focus away from
                the screen.
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
                Prevent the computer from sleeping while active tasks run to
                avoid interruptions.
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
        <AccordionTrigger className="text-sm sm:text-base">Keep in touch and community</AccordionTrigger>
        <AccordionContent className="flex flex-wrap gap-2 text-balance">
          <Button
            onClick={() =>
              open("https://github.com/milisp/codexia/discussions")
            }
            size="sm"
            className="flex-1 min-w-[120px]"
          >
            <Github className="h-4 w-4" />
            <span className="ml-2">Discussion</span>
          </Button>
          <Button
            onClick={() =>
              open("https://github.com/milisp/codexia/issues")
            }
            size="sm"
            className="flex-1 min-w-[100px]"
          >
            <Github className="h-4 w-4" />
            <span className="ml-2">Bug</span>
          </Button>
          <Button onClick={() => open("https://discord.gg/zAjtD4kf5K")} size="sm" className="flex-shrink-0">
            <img src="/discord.svg" height={16} width={16} alt="Discord" />
          </Button>
          <Button onClick={() => open("https://x.com/lisp_mi")} size="sm" className="flex-1 min-w-[100px]">
            <Twitter className="h-4 w-4" />
            <span className="ml-2">lisp_mi</span>
          </Button>
          <Button onClick={() => open("https://www.reddit.com/r/codexia/")} size="sm" className="flex-1 min-w-[120px]">
            <img src="/reddit.svg" height={16} width={16} alt="Reddit" />
            <span className="ml-2">r/codexia</span>
          </Button>
          <Button onClick={() => open("https://www.reddit.com/r/codex/")} size="sm" className="flex-1 min-w-[110px]">
            <img src="/reddit.svg" height={16} width={16} alt="Reddit" />
            <span className="ml-2">r/codex</span>
          </Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
