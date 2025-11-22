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
      className="w-full px-4"
      defaultValue="item-2"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>ChatGPT Auth</AccordionTrigger>
        <AccordionContent>
          <CodexAuth />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Settings</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <div className="flex justify-between">
            <span className="flex gap-2">
              <Button onClick={handleNewWindow} title={t("header.openNewWindow")}>
                <ExternalLink /> {t("header.openNewWindow")}
              </Button>
              <Link
                to="/login"
                className="flex hover:text-primary items-center justify-end"
              >
                <Button>
                  Codexia login
                </Button>
              </Link>
            </span>
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
                Play a short tone when tasks finish so you can focus away from
                the screen.
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
                Prevent the computer from sleeping while active tasks run to
                avoid interruptions.
              </p>
            </div>
            <Switch
              checked={preventSleepDuringTasks}
              onCheckedChange={setPreventSleepDuringTasks}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Keep in touch and community</AccordionTrigger>
        <AccordionContent className="flex gap-2 text-balance">
          <Button
            onClick={() =>
              open("https://github.com/milisp/codexia/discussions")
            }
          >
            <Github />
            Discussion
          </Button>
          <Button
            onClick={() =>
              open("https://github.com/milisp/codexia/issues")
            }
          >
            <Github />
            Bug
          </Button>
          <Button onClick={() => open("https://discord.gg/zAjtD4kf5K")}>
            <img src="/discord.svg" height={24} width={24} />
          </Button>
          <Button onClick={() => open("https://x.com/lisp_mi")}>
            <Twitter />
            lisp_mi
          </Button>
          <Button onClick={() => open("https://www.reddit.com/r/codexia/")}>
            <img src="/reddit.svg" height={24} width={24} />
            r/codexia
          </Button>
          <Button onClick={() => open("https://www.reddit.com/r/codex/")}>
            <img src="/reddit.svg" height={24} width={24} />
            r/codex
          </Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
