const apiBase = (import.meta.env.VITE_PLUX_API_URL || '').replace(/\/$/, '');

export const buildUrl = (path: string) => `${apiBase}${path}`;

export const isTauri = () =>
  typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);

export const wsUrl = () => {
  const custom = (import.meta.env.VITE_PLUX_WS_URL || '').replace(/\/$/, '');
  if (custom) {
    return custom;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws`;
};
