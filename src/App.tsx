import { UpdateToast } from "@/components/codex-v2/UpdateToast";
import { useUpdaterV2 } from "@/hooks/codex/v2/useUpdaterV2";
import { useDebugLogV2 } from "@/hooks/codex/v2/useDebugLogV2";
import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { useDeepLink } from "./hooks/useDeepLink";
import { initializeActiveConversationSubscription } from "@/stores/codex/useActiveConversationStore";
import { invoke } from "@/lib/tauri-proxy";
import { InitializeResponse } from "@/bindings/InitializeResponse";
import "./App.css";

export default function App() {
  // Initialize deep linking - must be called at top level, not conditionally
  useDeepLink();
  const [initialized, setInitialized] = useState(false);

  const { addDebugEntry } = useDebugLogV2();
  const updater = useUpdaterV2({ onDebug: addDebugEntry });

  useEffect(() => {
    // Initialize codex client before any other operations
    const initializeCodex = async () => {
      try {
        await invoke<InitializeResponse>("initialize_client");
        console.log("Codex client initialized successfully");
        setInitialized(true);
      } catch (error) {
        console.error("Failed to initialize codex client", error);
        // Still mark as initialized to allow UI to load, but log the error
        setInitialized(true);
      }

      // Initialize store subscriptions after codex client is initialized
      initializeActiveConversationSubscription();
    };

    // Wait for initialization
    initializeCodex();
  }, []);

  if (!initialized) {
    return <div className="flex items-center justify-center h-screen">Initializing...</div>;
  }

  return (
    <>
      <UpdateToast
        state={updater.state}
        onUpdate={updater.startUpdate}
        onDismiss={updater.dismiss}
      />
      <Layout />
    </>
  );
}