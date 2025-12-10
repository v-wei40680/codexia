import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { useDeepLink } from "./hooks/useDeepLink";
import { initializeActiveConversationSubscription } from "@/stores/codex/useActiveConversationStore";
import "./App.css";

export default function App() {

  useEffect(() => {
    // Initialize store subscriptions
    initializeActiveConversationSubscription();

    // Initialize deep linking (non-dev mode)
    if (!import.meta.env.DEV) {
      useDeepLink();
    }
  }, []);

  return <Layout />;
}