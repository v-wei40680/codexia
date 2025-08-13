import { createHashRouter } from "react-router-dom";

import { Layout } from "@/components/Layout";
import ChatPage from "@/pages/chat";

export const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <ChatPage />
      }
    ],
  },
]);
