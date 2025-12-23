import { useEffect, useMemo, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

import { Button } from "@/components/ui/button";
import { invoke } from "@/lib/tauri-proxy";
import { useFolderStore } from "@/stores/FolderStore";
import { getErrorMessage } from "@/utils/errorUtils";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePageView, useTrackEvent } from "@/hooks";

const AGENTS_FILE_NAME = "AGENTS.md";

export default function AgentPage() {
  const { currentFolder } = useFolderStore();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useThemeContext();

  const trackEvent = useTrackEvent();
  usePageView("agent_editor");

  const filePath = useMemo(() => {
    if (currentFolder) {
      const trimmed = currentFolder.replace(/\/$/, "");
      return `${trimmed}/${AGENTS_FILE_NAME}`;
    }
    return AGENTS_FILE_NAME;
  }, [currentFolder]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setStatusMessage(null);

    (async () => {
      try {
        const instructions = await invoke<string>("read_file", { filePath });
        if (active) {
          setContent(instructions);
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
          trackEvent.errorOccurred("agents_file_read_failed", undefined, "agent_editor");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [filePath]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setStatusMessage(null);
    trackEvent.fileSaved("AGENTS.md");
    try {
      await invoke("write_file", { filePath, content });
      setStatusMessage("Changes saved.");
    } catch (err) {
      setError(getErrorMessage(err));
      trackEvent.errorOccurred("agents_file_save_failed", undefined, "agent_editor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground">
            {currentFolder}/AGENTS.md
          </p>
          <span className="text-sm">
            Editing workspace instructions
          </span>
        </div>
        <Button
          onClick={handleSave}
          disabled={loading || saving}
          variant="secondary"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="flex flex-1 flex-col">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading instructions…</div>
        ) : null}
        {error ? (
          <div className="rounded border border-destructive/70 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {statusMessage ? (
          <div className="rounded border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-900">
            {statusMessage}
          </div>
        ) : null}
        <div className="min-h-0" data-color-mode={theme}>
          <MDEditor
            value={content}
            onChange={(value) => setContent(value ?? "")}
            textareaProps={{
              placeholder: "Write instructions in markdown…",
              spellCheck: false,
            }}
            height={640}
          /></div>
      </div>
    </div>
  );
}
