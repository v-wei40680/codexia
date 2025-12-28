import { Switch } from "@/components/ui/switch";

export const MESSAGE_FILTER_OPTIONS = [
  { type: "user_message", label: "User Messages" },
  { type: "agent_message", label: "Agent Messages" },
  { type: "agent_reasoning", label: "Agent Reasoning" },
  { type: "agent_reasoning_raw_content", label: "Raw Agent Reasoning" },
  { type: "exec_command", label: "Execution Commands" },
  { type: "update_plan", label: "Plan Updates" },
  { type: "apply_patch", label: "Patches" },
  { type: "custom_tool_call", label: "Custom Tool Calls" },
  { type: "custom_tool_call_output", label: "Custom Tool Call Outputs" },
];

export const createInitialFilterState = () =>
  MESSAGE_FILTER_OPTIONS.reduce<Record<string, boolean>>((acc, filter) => {
    acc[filter.type] = true;
    return acc;
  }, {});

type HistoryFiltersProps = {
  messageTypes: Record<string, boolean>;
  onFilterChange: (type: string, checked: boolean) => void;
  className?: string;
};

export function HistoryFilters({
  messageTypes,
  onFilterChange,
  className,
}: HistoryFiltersProps) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        {MESSAGE_FILTER_OPTIONS.map((filter) => (
          <label key={filter.type} className="flex items-center gap-2 text-sm text-foreground/80">
            <Switch
              checked={messageTypes[filter.type] ?? true}
              onCheckedChange={(checked) =>
                onFilterChange(filter.type, checked)
              }
              aria-label={`Toggle filter ${filter.label}`}
            />
            <span>{filter.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
