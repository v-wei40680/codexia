import { useEffect, useMemo, useState } from "react";
import MDEditor from "@uiw/react-md-editor";


import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { invoke } from "@/lib/tauri-proxy";
import { useFolderStore } from "@/stores/FolderStore";
import { useNavigationStore } from "@/stores/navigationStore";
import { getErrorMessage } from "@/utils/errorUtils";
import { useThemeContext } from "@/contexts/ThemeContext";

const CODEX_INSTRUCTIONS_FILE_NAME = "AGENTS.md";
const CC_INSTRUCTIONS_FILE_NAME = "CLAUDE.md";

export default function AgentsView() {
  const { currentFolder } = useFolderStore();
  const { selectedAgent, instructionType, setSelectedAgent, setInstructionType } = useNavigationStore();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useThemeContext();

  // Ensure we have default values
  const currentAgent = selectedAgent || "codex";
  const currentInstructionType = instructionType || "project";

  // Set default values on mount if not set
  useEffect(() => {
    if (!selectedAgent) {
      setSelectedAgent("codex");
    }
    if (!instructionType) {
      setInstructionType("project");
    }
  }, [selectedAgent, instructionType, setSelectedAgent, setInstructionType]);

  const filePath = useMemo(() => {
    const fileName = currentAgent === "cc" ? CC_INSTRUCTIONS_FILE_NAME : CODEX_INSTRUCTIONS_FILE_NAME;
    
    if (currentInstructionType === "system") {
      // System instructions: ~/.codex/AGENTS.md or ~/.claude/CLAUDE.md
      const configDir = currentAgent === "cc" ? ".claude" : ".codex";
      return `~/${configDir}/${fileName}`;
    } else {
      // Project instructions: $currentFolder/AGENTS.md or $currentFolder/CLAUDE.md
      if (currentFolder) {
        const trimmed = currentFolder.replace(/\/$/, "");
        return `${trimmed}/${fileName}`;
      }
      return fileName;
    }
  }, [currentFolder, currentAgent, currentInstructionType]);

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
        // If file doesn't exist, start with empty content (for new files)
        const errorMsg = getErrorMessage(err);
        if (errorMsg.includes("does not exist")) {
          if (active) {
            setContent("");
          }
        } else {
          if (active) {
            setError(errorMsg);
          }
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
    try {
      await invoke("write_file", { filePath, content });
      setStatusMessage("Changes saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAgentChange = (agent: string) => {
    setSelectedAgent(agent as "codex" | "cc");
  };

  const handleInstructionTypeChange = (type: string) => {
    setInstructionType(type as "system" | "project");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col border-b">
        {/* Tabs for Agent and Instruction Type */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-4">
            <Tabs
              value={currentAgent}
              onValueChange={handleAgentChange}
              className="w-auto"
            >
              <TabsList>
                <TabsTrigger value="codex">Codex</TabsTrigger>
                <TabsTrigger value="cc">Claude Code</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs
              value={currentInstructionType}
              onValueChange={handleInstructionTypeChange}
              className="w-auto"
            >
              <TabsList>
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="project">Project</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* File path and Save button */}
        <div className="flex items-center justify-between px-6 pb-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-muted-foreground">
              {filePath}
            </p>
            <span className="text-sm">
              Editing {currentInstructionType === "system" ? "system" : "project"} instructions
              {` (${currentAgent})`}
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
