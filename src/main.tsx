import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/lib/i18n';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const TrayView = lazy(() => import('@/views/TrayView'));
const AboutView = lazy(() => import('@/views/AboutView'));

const isTrayWindow = window.location.pathname === '/tray';
const isAboutWindow = window.location.pathname === '/about';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <TooltipProvider>
          {isTrayWindow ? (
            <Suspense>
              <TrayView />
            </Suspense>
          ) : isAboutWindow ? (
            <Suspense>
              <AboutView />
            </Suspense>
          ) : (
            <>
              <App />
              <Toaster />
            </>
          )}
        </TooltipProvider>
      </I18nextProvider>
    </ThemeProvider>
  </React.StrictMode>
);
