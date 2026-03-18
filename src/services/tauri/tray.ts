import { invoke } from '@tauri-apps/api/core';

export const resizeTrayWindow = (height: number): Promise<void> =>
  invoke('resize_tray_window', { height });

export const showMainWindow = (): Promise<void> =>
  invoke('show_main_window');
