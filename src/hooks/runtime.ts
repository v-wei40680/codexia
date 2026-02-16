const DEFAULT_PORT = 7420;
const configuredPort = Number(import.meta.env.VITE_WEB_PORT || DEFAULT_PORT);

const resolveApiBase = () => {
  if (typeof window === 'undefined') {
    return `http://127.0.0.1:${configuredPort}`;
  }

  // Production bundles are served by the backend web server, so use same-origin
  // to avoid compile-time port drift between frontend and backend.
  if (import.meta.env.PROD) {
    return window.location.origin;
  }

  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  const host = window.location.hostname || '127.0.0.1';
  return `${protocol}://${host}:${configuredPort}`;
};

export const buildUrl = (path: string) => `${resolveApiBase()}${path}`;

const resolveWsBase = () => {
  if (typeof window === 'undefined') {
    return `ws://127.0.0.1:${configuredPort}`;
  }

  if (import.meta.env.PROD) {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname || '127.0.0.1';
  return `${protocol}://${host}:${configuredPort}`;
};

export const buildWsUrl = (path: string) => `${resolveWsBase()}${path}`;

export const isTauri = () =>
  typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
