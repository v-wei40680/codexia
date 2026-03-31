import { Sparkles } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useAgentLimit } from '@/hooks/useAgentLimit';
import { PRICING_URL } from '@/lib/constants';

export function GetProButton() {
  const { isPro } = useAgentLimit();

  if (isPro) return null;

  return (
    <button
      onClick={() => void openUrl(PRICING_URL)}
      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-colors shrink-0"
      title="Upgrade to Pro"
    >
      <Sparkles className="h-3 w-3" />
      Get Pro Plan
    </button>
  );
}
