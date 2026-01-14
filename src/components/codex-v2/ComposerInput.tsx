import { useEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";
import type { AutocompleteItem } from "@/hooks/codex/v2/useComposerAutocompleteV2";

type ComposerInputProps = {
  text: string;
  disabled: boolean;
  sendLabel: string;
  canStop: boolean;
  onStop: () => void;
  onSend: () => void;
  onTextChange: (next: string, selectionStart: number | null) => void;
  onSelectionChange: (selectionStart: number | null) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  suggestionsOpen: boolean;
  suggestions: AutocompleteItem[];
  highlightIndex: number;
  onHighlightIndex: (index: number) => void;
  onSelectSuggestion: (item: AutocompleteItem) => void;
};

export function ComposerInput({
  text,
  disabled,
  sendLabel,
  canStop,
  onStop,
  onSend,
  onTextChange,
  onSelectionChange,
  onKeyDown,
  textareaRef,
  suggestionsOpen,
  suggestions,
  highlightIndex,
  onHighlightIndex,
  onSelectSuggestion,
}: ComposerInputProps) {
  const suggestionListRef = useRef<HTMLDivElement | null>(null);
  const suggestionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const maxTextareaHeight = 120;
  const isFileSuggestion = (item: AutocompleteItem) =>
    item.label.includes("/") || item.label.includes("\\");
  const fileTitle = (path: string) => {
    const normalized = path.replace(/\\/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : path;
  };

  useEffect(() => {
    if (!suggestionsOpen) {
      return;
    }
    const list = suggestionListRef.current;
    const item = suggestionRefs.current[highlightIndex];
    if (!list || !item) {
      return;
    }
    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.top < listRect.top) {
      item.scrollIntoView({ block: "nearest" });
      return;
    }
    if (itemRect.bottom > listRect.bottom) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex, suggestionsOpen, suggestions.length]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, maxTextareaHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxTextareaHeight ? "auto" : "hidden";
  }, [text, textareaRef]);

  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
      <div className="relative min-w-0">
        <textarea
          ref={textareaRef}
          className="w-full min-h-[60px] max-h-[120px] h-[60px] resize-none bg-transparent border-none text-[#e6e7ea] text-sm py-2 px-1 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed custom-scrollbar"
          placeholder={
            disabled
              ? "Review in progress. Chat will re-enable when it completes."
              : "Ask Codex to do something..."
          }
          value={text}
          onChange={(event) =>
            onTextChange(event.target.value, event.target.selectionStart)
          }
          onSelect={(event) =>
            onSelectionChange(
              (event.target as HTMLTextAreaElement).selectionStart,
            )
          }
          disabled={disabled}
          onKeyDown={onKeyDown}
        />
        {suggestionsOpen && (
          <div className="absolute left-0 bottom-[calc(100%+6px)] z-50 grid gap-1 p-1.5 rounded-xl bg-[#0c101a]/96 border border-white/[0.06] shadow-2xl w-full max-w-[420px] max-h-[220px] overflow-y-auto custom-scrollbar" role="listbox" ref={suggestionListRef}>
            {suggestions.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`flex flex-col gap-0.5 text-left p-2 rounded-lg transition-colors outline-none ${index === highlightIndex ? "bg-white/[0.08]" : "bg-transparent"
                  }`}
                role="option"
                aria-selected={index === highlightIndex}
                ref={(node) => {
                  suggestionRefs.current[index] = node;
                }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelectSuggestion(item)}
                onMouseEnter={() => onHighlightIndex(index)}
              >
                {isFileSuggestion(item) ? (
                  <>
                    <span className="text-xs font-semibold text-white/90 truncate w-full">
                      {fileTitle(item.label)}
                    </span>
                    <span className="text-[10px] text-white/40 truncate w-full">
                      {item.label}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-white/90 truncate w-full">{item.label}</span>
                    {item.description && (
                      <span className="text-[10px] text-white/40 truncate w-full">
                        {item.description}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        className="w-6 h-6 flex items-center justify-center rounded-full border border-[rgba(255,107,107,0.6)] bg-[rgba(255,107,107,0.12)] text-white hover:bg-[rgba(255,107,107,0.2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        onClick={onStop}
        disabled={disabled || !canStop}
        aria-label="Stop"
      >
        <span className="w-1.5 h-1.5 rounded-sm bg-current" aria-hidden />
      </button>
      <button
        className="w-6 h-6 flex items-center justify-center rounded-full border border-white/50 bg-transparent text-white hover:bg-white/[0.14] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        onClick={onSend}
        disabled={disabled}
        aria-label={sendLabel}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" aria-hidden>
          <path
            d="M12 5l6 6m-6-6L6 11m6-6v14"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
