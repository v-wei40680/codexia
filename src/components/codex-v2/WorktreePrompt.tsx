import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WorktreePromptProps = {
  workspaceName: string;
  branch: string;
  error?: string | null;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy?: boolean;
};

export function WorktreePrompt({
  workspaceName,
  branch,
  error = null,
  onChange,
  onCancel,
  onConfirm,
  isBusy = false,
}: WorktreePromptProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-label="Close"
      />
      <div className="relative w-full max-w-md rounded-xl border bg-background p-5 shadow-xl">
        <div className="text-base font-semibold">New worktree agent</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Create a worktree under &quot;{workspaceName}&quot;.
        </div>
        <label className="mt-4 block text-sm font-medium" htmlFor="worktree-branch">
          Branch name
        </label>
        <Input
          id="worktree-branch"
          ref={inputRef}
          value={branch}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
            if (event.key === "Enter") {
              event.preventDefault();
              onConfirm();
            }
          }}
          disabled={isBusy}
          className="mt-2"
        />
        {error && (
          <div className="mt-2 text-sm text-destructive">{error}</div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isBusy}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isBusy || branch.trim().length === 0}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
