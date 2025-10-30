import { createHashRouter, Outlet } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import LoginPage from "@/pages/login";
import ChatPage from "@/pages/chat";
import ProjectsPage from "@/pages/projects";
import SettingsPage from "./pages/settings";
import ReviewPage from "./pages/review";
import UsagePage from "./pages/usage";
import { useDeepLink } from "./hooks/useDeepLink";
import PublicUserPage from "./pages/user";
import { useEffect } from "react";
import { useLayoutStore } from "./stores/layoutStore";
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
  const { loading } = useAuth();

  if (loading) {
    return null;
  }

  return <Outlet />;
}

export const router = createHashRouter([
  {
    path: "/",
    element: <Root />,
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
        element: <RequireAuth />,
        children: [
          {
            path: "chat",
            element: <ChatPage />,
          },
          {
            path: "review",
            element: <ReviewPage />,
          },
          {
            path: "settings",
            element: <SettingsPage />,
          },
          {
            path: "usage",
            element: <UsagePage />,
          },
        ],
      },
    ],
  },
]);
