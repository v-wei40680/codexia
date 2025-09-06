import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  version: string;
  date: string;
  body: string;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export class UpdaterService {
  private static instance: UpdaterService;
  private updateInfo: UpdateInfo | null = null;
  private isChecking = false;
  private isDownloading = false;
  private progress: UpdateProgress = { downloaded: 0, total: 0, percentage: 0 };

  private constructor() {}

  static getInstance(): UpdaterService {
    if (!UpdaterService.instance) {
      UpdaterService.instance = new UpdaterService();
    }
    return UpdaterService.instance;
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (this.isChecking) {
      return this.updateInfo;
    }

    this.isChecking = true;
    try {
      const update = await check();
      if (update) {
        this.updateInfo = {
          version: update.version || 'Unknown',
          date: update.date || new Date().toISOString(),
          body: update.body || 'No release notes available'
        };
        console.log(`Found update ${update.version} from ${update.date}`);
        return this.updateInfo;
      }
      return null;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return null;
    } finally {
      this.isChecking = false;
    }
  }

  async downloadAndInstall(
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<boolean> {
    if (!this.updateInfo || this.isDownloading) {
      return false;
    }

    this.isDownloading = true;
    this.progress = { downloaded: 0, total: 0, percentage: 0 };

    try {
      const update = await check();
      if (!update) {
        return false;
      }

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            this.progress.total = event.data.contentLength ?? 0;
            console.log(`Started downloading ${this.progress.total} bytes`);
            break;
          case 'Progress':
            this.progress.downloaded += event.data.chunkLength;
            this.progress.percentage = this.progress.total > 0 
              ? (this.progress.downloaded / this.progress.total) * 100 
              : 0;
            console.log(`Downloaded ${this.progress.downloaded}/${this.progress.total} (${this.progress.percentage.toFixed(1)}%)`);
            onProgress?.(this.progress);
            break;
          case 'Finished':
            console.log('Download finished');
            break;
        }
      });

      console.log('Update installed, restarting...');
      await relaunch();
      return true;
    } catch (error) {
      console.error('Failed to download and install update:', error);
      return false;
    } finally {
      this.isDownloading = false;
    }
  }

  getUpdateInfo(): UpdateInfo | null {
    return this.updateInfo;
  }

  getProgress(): UpdateProgress {
    return this.progress;
  }

  isUpdateAvailable(): boolean {
    return this.updateInfo !== null;
  }

  isCurrentlyDownloading(): boolean {
    return this.isDownloading;
  }
}

// Export singleton instance
export const updater = UpdaterService.getInstance();