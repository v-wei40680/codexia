import { RouterProvider, createHashRouter } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import ChatPage from "@/pages/chat";
import ProjectsPage from "@/pages/projects";
import DxtPage from "./pages/dxt";
import SettingsPage from "./pages/settings";
import { useLayoutStore } from "./stores/layoutStore";
import "./App.css";

export default function App() {
  const { lastRoute } = useLayoutStore();

  const router = createHashRouter([
    {
      path: "/",
      element: <Layout />,
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
      ],
    },
  ]);

  useEffect(() => {
    if (lastRoute && lastRoute !== "/") {
      window.location.hash = lastRoute;
    }
  }, []);

  return <RouterProvider router={router} />;
}