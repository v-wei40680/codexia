import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './App.css';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/lib/i18n';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <TooltipProvider>
          <App />
          <Toaster />
        </TooltipProvider>
      </I18nextProvider>
    </ThemeProvider>
  </React.StrictMode>
);
