import type { AccessMode, ThreadTokenUsage } from "@/types/codex-v2";

type ComposerMetaBarProps = {
  disabled: boolean;
  models: { id: string; displayName: string; model: string }[];
  selectedModelId: string | null;
  onSelectModel: (id: string) => void;
  reasoningOptions: string[];
  selectedEffort: string | null;
  onSelectEffort: (effort: string) => void;
  accessMode: AccessMode;
  onSelectAccessMode: (mode: AccessMode) => void;
  contextUsage?: ThreadTokenUsage | null;
};

export function ComposerMetaBar({
  disabled,
  models,
  selectedModelId,
  onSelectModel,
  reasoningOptions,
  selectedEffort,
  onSelectEffort,
  accessMode,
  onSelectAccessMode,
  contextUsage = null,
}: ComposerMetaBarProps) {
  const contextWindow = contextUsage?.modelContextWindow ?? null;
  const lastTokens = contextUsage?.last.totalTokens ?? 0;
  const totalTokens = contextUsage?.total.totalTokens ?? 0;
  const usedTokens = lastTokens > 0 ? lastTokens : totalTokens;
  const contextFreePercent =
    contextWindow && contextWindow > 0 && usedTokens > 0
      ? Math.max(
        0,
        100 -
        Math.min(Math.max((usedTokens / contextWindow) * 100, 0), 100),
      )
      : null;

  return (
    <div className="flex items-center pt-1.5 border-t border-white/[0.06] gap-3">
      <div className="flex gap-2 flex-wrap items-center">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
          <span className="w-3.5 h-3.5 text-white/40 shrink-0" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M7 8V6a5 5 0 0 1 10 0v2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <rect
                x="4.5"
                y="8"
                width="15"
                height="11"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <circle cx="9" cy="13" r="1" fill="currentColor" />
              <circle cx="15" cy="13" r="1" fill="currentColor" />
              <path
                d="M9 16h6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <select
            className="appearance-none bg-transparent border-none text-[11px] text-white/70 focus:outline-none cursor-pointer pr-4 hover:text-white transition-colors"
            style={{
              backgroundImage: 'linear-gradient(45deg, transparent 50%, rgba(255,255,255,0.4) 50%), linear-gradient(135deg, rgba(255,255,255,0.4) 50%, transparent 50%)',
              backgroundPosition: 'calc(100% - 6px) center, calc(100% - 2px) center',
              backgroundSize: '4px 4px, 4px 4px',
              backgroundRepeat: 'no-repeat'
            }}
            aria-label="Model"
            value={selectedModelId ?? ""}
            onChange={(event) => onSelectModel(event.target.value)}
            disabled={disabled}
          >
            {models.length === 0 && <option value="">No models</option>}
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.displayName || model.model}
              </option>
            ))}
          </select>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
          <span className="w-3.5 h-3.5 text-white/40 shrink-0" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M8.5 4.5a3.5 3.5 0 0 0-3.46 4.03A4 4 0 0 0 6 16.5h2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M15.5 4.5a3.5 3.5 0 0 1 3.46 4.03A4 4 0 0 1 18 16.5h-2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M9 12h6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M12 12v6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <select
            className="appearance-none bg-transparent border-none text-[11px] text-white/70 focus:outline-none cursor-pointer pr-4 hover:text-white transition-colors"
            style={{
              backgroundImage: 'linear-gradient(45deg, transparent 50%, rgba(255,255,255,0.4) 50%), linear-gradient(135deg, rgba(255,255,255,0.4) 50%, transparent 50%)',
              backgroundPosition: 'calc(100% - 6px) center, calc(100% - 2px) center',
              backgroundSize: '4px 4px, 4px 4px',
              backgroundRepeat: 'no-repeat'
            }}
            aria-label="Thinking mode"
            value={selectedEffort ?? ""}
            onChange={(event) => onSelectEffort(event.target.value)}
            disabled={disabled}
          >
            {reasoningOptions.length === 0 && <option value="">Default</option>}
            {reasoningOptions.map((effort) => (
              <option key={effort} value={effort}>
                {effort}
              </option>
            ))}
          </select>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
          <span className="w-3.5 h-3.5 text-white/40 shrink-0" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 4l7 3v5c0 4.5-3 7.5-7 8-4-0.5-7-3.5-7-8V7l7-3z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M9.5 12.5l1.8 1.8 3.7-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <select
            className="appearance-none bg-transparent border-none text-[11px] text-white/70 focus:outline-none cursor-pointer pr-4 hover:text-white transition-colors"
            style={{
              backgroundImage: 'linear-gradient(45deg, transparent 50%, rgba(255,255,255,0.4) 50%), linear-gradient(135deg, rgba(255,255,255,0.4) 50%, transparent 50%)',
              backgroundPosition: 'calc(100% - 6px) center, calc(100% - 2px) center',
              backgroundSize: '4px 4px, 4px 4px',
              backgroundRepeat: 'no-repeat'
            }}
            aria-label="Agent access"
            disabled={disabled}
            value={accessMode}
            onChange={(event) =>
              onSelectAccessMode(event.target.value as AccessMode)
            }
          >
            <option value="read-only">Read only</option>
            <option value="current">On-Request</option>
            <option value="full-access">Full access</option>
          </select>
        </div>
      </div>
      <div className="ml-auto">
        <div
          className="w-5 h-5 rounded-full grid place-items-center relative group"
          style={{
            background: `radial-gradient(circle, #0c141e 54%, transparent 56%), conic-gradient(from 180deg, hsl(${120 * (contextFreePercent ?? 0) / 100}, 80%, 55%) ${(contextFreePercent ?? 0)}%, rgba(255,255,255,0.14) 0)`
          }}
          aria-label={
            contextFreePercent === null
              ? "Context free --"
              : `Context free ${Math.round(contextFreePercent)}%`
          }
        >
          <span className="text-[6px] text-white/60 font-medium">●</span>
          <div className="absolute bottom-[calc(100%+6px)] right-0 px-2 py-1 rounded-full bg-[#0c101a] border border-white/[0.08] text-[10px] text-white/90 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-y-1 group-hover:translate-y-0 shadow-2xl z-50">
            {contextFreePercent === null
              ? "Context free --"
              : `Context free ${Math.round(contextFreePercent)}%`}
          </div>
        </div>
      </div>
    </div>
  );
}
