import { useMemo } from "react";
import { getNewConversationParams } from "@/components/config/ConversationParams";
import { useProviderStore } from "@/stores/useProviderStore";
import { useSandboxStore } from "@/stores/useSandboxStore";
import { useCodexStore } from "@/stores/useCodexStore";

export function useBuildNewConversationParams() {
  const { providers, selectedProviderId, selectedModel, reasoningEffort } =
    useProviderStore();
  const { mode, approvalPolicy } = useSandboxStore();
  const { cwd, webSearchEnabled } = useCodexStore();

  const buildNewConversationParams = useMemo(() => {
    const provider = providers.find((item) => item.id === selectedProviderId);

    return getNewConversationParams(
      provider,
      selectedModel ?? "llama3.2",
      cwd,
      approvalPolicy,
      mode,
      {
        model_reasoning_effort: reasoningEffort,
        "tools.web_search": webSearchEnabled,
      },
    );
  }, [
    approvalPolicy,
    cwd,
    mode,
    providers,
    reasoningEffort,
    selectedModel,
    selectedProviderId,
    webSearchEnabled,
  ]);

  return buildNewConversationParams;
}
