import { Sparkles } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useAgentLimit } from '@/hooks/useAgentLimit';
import { useAgentCenterStore } from '@/stores';

const PRICING_URL = 'https://milisp.dev/pricing';

export function GetProButton() {
  const { isPro } = useAgentLimit();
  const cards = useAgentCenterStore((s) => s.cards);
  const maxCards = useAgentCenterStore((s) => s.maxCards);

  if (isPro) return null;

  const atLimit = cards.length >= maxCards;

  return (
    <button
      onClick={() => void openUrl(PRICING_URL)}
      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-colors shrink-0"
      title={atLimit ? `Limit reached (${maxCards} agents). Upgrade to add more.` : 'Upgrade to Pro'}
    >
      <Sparkles className="h-3 w-3" />
      Get Pro Plan
      {atLimit && <span className="opacity-80">({cards.length}/{maxCards})</span>}
    </button>
  );
}
