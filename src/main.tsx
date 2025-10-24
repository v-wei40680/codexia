import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import "./App.css";
import { I18nextProvider } from "react-i18next";
import { i18n } from "@/lib/i18n";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
