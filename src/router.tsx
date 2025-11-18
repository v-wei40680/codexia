import { useEffect } from "react";
import { createHashRouter, Navigate, Outlet } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { RouteErrorFallback } from "@/components/common/RouteErrorFallback";
import ChatPage from "@/pages/chat";
import LoginPage from "@/pages/login";
import NotFoundPage from "@/pages/not-found";
import ProjectsPage from "@/pages/projects";
import PublicUserPage from "@/pages/user";
import SettingsPage from "./pages/settings";
import UsagePage from "./pages/usage";
import ReviewPage from "./pages/review";
import McpPage from "./pages/mcp";
import AgentPage from "@/pages/agents";
import { useDeepLink } from "./hooks/useDeepLink";
import { useLayoutStore } from "./stores/settings/layoutStore";
import { useAuth } from "./hooks/useAuth";

function Root() {
  if (!import.meta.env.DEV) {
    useDeepLink();
  }

  const { lastRoute } = useLayoutStore();

  useEffect(() => {
    if (lastRoute && lastRoute !== "/") {
      window.location.hash = lastRoute;
    }
  }, []);
  return <Layout />;
}

function RequireAuth() {
  const { loading, user } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export const router = createHashRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        index: true,
        element: <ProjectsPage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "u/:id",
        element: <PublicUserPage />,
      },
      {
        path: "chat",
        element: <ChatPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "mcp",
        element: <McpPage />,
      },
      {
        path: "agents.md",
        element: <AgentPage />,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: "usage",
            element: <UsagePage />,
          },
          {
            path: "review",
            element: <ReviewPage />,
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
