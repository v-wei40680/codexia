import { createHashRouter, Navigate, Outlet } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import LoginPage from "@/pages/login";
import ChatPage from "@/pages/chat";
import ProjectsPage from "@/pages/projects";
import DxtPage from "./pages/dxt";
import SettingsPage from "./pages/settings";
import UsagePage from "./pages/usage";
import ProfilePage from "./pages/profile";
import ShareProjectPage from "./pages/share";
import PublicUserPage from "./pages/user";
import ExploreProjectsPage from "./pages/explore";
import { useDeepLink } from "./hooks/useDeepLink";
import { useEffect } from "react";
import { useLayoutStore } from "./stores/layoutStore";
import { useAuth } from "./hooks/useAuth";
import { useProfileStatus } from "./hooks/useProfileStatus";

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

function RequireProfile() {
  const { hasProfile, loading, requiresProfileCheck } = useProfileStatus();

  // If profile check does not apply (no auth or Supabase disabled), allow through.
  if (!requiresProfileCheck) return <Outlet />;
  if (loading) return null;
  if (!hasProfile) return <Navigate to="/profile?onboarding=1" replace />;
  return <Outlet />;
}

export const router = createHashRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        // Gate explore page behind profile completion when applicable
        element: <RequireProfile />,
        children: [
          {
            path: "explore",
            element: <ExploreProjectsPage />,
          },
        ],
      },
      {
        path: "u/:id",
        element: <PublicUserPage />,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            index: true,
            element: <ProjectsPage />,
          },
          {
            path: "chat",
            element: <ChatPage />,
          },
          {
            path: "dxt",
            element: <DxtPage />,
          },
          {
            path: "settings",
            element: <SettingsPage />,
          },
          {
            path: "usage",
            element: <UsagePage />,
          },
          {
            path: "profile",
            element: <ProfilePage />,
          },
          {
            // Gate share page behind profile completion when applicable
            element: <RequireProfile />,
            children: [
              {
                path: "share",
                element: <ShareProjectPage />,
              },
              {
                path: "share/:id",
                element: <ShareProjectPage />,
              },
            ],
          },
        ],
      },
    ],
  },
]);
