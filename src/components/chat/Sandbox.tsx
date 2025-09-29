import React, { useMemo, useState } from "react";
import { Bot, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { APPROVAL_POLICIES, CodexConfig, SANDBOX_MODES } from "@/types/codex";

interface SandboxProps {
  sandboxMode: CodexConfig["sandboxMode"];
  approvalPolicy: CodexConfig["approvalPolicy"];
  onConfigChange: (
    updates: Partial<Pick<CodexConfig, "sandboxMode" | "approvalPolicy">>,
  ) => void;
}

const MODE_OPTIONS: Array<{
  value: CodexConfig["sandboxMode"];
  selectorLabel: string;
}> = [
  { value: "read-only", selectorLabel: "Chat" },
  { value: "workspace-write", selectorLabel: "Agent" },
  { value: "danger-full-access", selectorLabel: "Agent (Full)" },
];

export const Sandbox: React.FC<SandboxProps> = ({
  sandboxMode,
  approvalPolicy,
  onConfigChange,
}) => {
  const [open, setOpen] = useState(false);
  const currentMode = SANDBOX_MODES[sandboxMode];
  const currentPolicy = useMemo(
    () => APPROVAL_POLICIES.find((policy) => policy.value === approvalPolicy),
    [approvalPolicy],
  );

  const currentSelectorLabel =
    MODE_OPTIONS.find((option) => option.value === sandboxMode)
      ?.selectorLabel || currentMode.shortLabel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="gap-1">
          <Bot className="h-4 w-4" />
          <span className="text-sm font-medium">{currentSelectorLabel}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[520px] p-4">
        <div className="grid grid-cols-[120px_1fr_1fr] gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Mode
            </p>
            <div className="flex flex-col gap-2">
              {MODE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={sandboxMode === option.value ? "default" : "ghost"}
                  className="justify-start"
                  onClick={() => {
                    onConfigChange({
                      sandboxMode: option.value,
                      approvalPolicy:
                        SANDBOX_MODES[option.value].defaultApprovalPolicy,
                    });
                  }}
                >
                  {option.selectorLabel}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sandbox
            </p>
            <TooltipProvider>
              <div className="space-y-2">
                {MODE_OPTIONS.map((option) => (
                  <Tooltip key={option.value}>
                    <TooltipTrigger asChild>
                      <div
                        className={`rounded-md border p-3 text-sm transition-colors ${
                          sandboxMode === option.value
                            ? "border-primary bg-accent/40"
                            : "border-border"
                        }`}
                      >
                        <div className="text-xs font-semibold uppercase text-muted-foreground">
                          {option.selectorLabel}
                        </div>
                        <div className="text-sm font-medium">
                          {SANDBOX_MODES[option.value].label}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="max-w-xs text-sm">
                        {SANDBOX_MODES[option.value].description}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Approval
            </p>
            <div className="grid grid-cols-1 gap-2">
              {APPROVAL_POLICIES.map((policy) => (
                <Button
                  key={policy.value}
                  size="sm"
                  variant={
                    policy.value === approvalPolicy ? "default" : "outline"
                  }
                  className="justify-start"
                  onClick={() => {
                    onConfigChange({ approvalPolicy: policy.value });
                  }}
                >
                  {policy.label}
                </Button>
              ))}
            </div>
            {currentPolicy && (
              <p className="text-xs text-muted-foreground">
                {currentPolicy.description}
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
