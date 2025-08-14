import { createHashRouter } from "react-router-dom";

import { Layout } from "@/components/Layout";
import ChatPage from "@/pages/chat";
import ProjectsPage from "@/pages/projects";
import DxtPage from "./pages/dxt";

export const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <ProjectsPage />
      },
      {
        path: "chat",
        element: <ChatPage />
      },
      {
        path: "dxt",
        element: <DxtPage />
      }
    ],
  },
]);
