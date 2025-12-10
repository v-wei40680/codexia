import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { useDeepLink } from "./hooks/useDeepLink";
import { initializeActiveConversationSubscription } from "@/stores/codex/useActiveConversationStore";
import "./App.css";

export default function App() {
  // Initialize deep linking - must be called at top level, not conditionally
  useDeepLink();

  useEffect(() => {
    // Initialize store subscriptions
    initializeActiveConversationSubscription();
  }, []);

  return <Layout />;
}