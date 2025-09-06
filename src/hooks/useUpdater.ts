import { useState, useEffect, useCallback } from 'react';
import { updater, UpdateInfo, UpdateProgress } from '@/components/updater';

export const useUpdater = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress>({ downloaded: 0, total: 0, percentage: 0 });
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const update = await updater.checkForUpdates();
      setUpdateInfo(update);
      return update;
    } catch (err) {
      const errorMessage = 'Failed to check for updates';
      setError(errorMessage);
      console.error('Update check failed:', err);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!updateInfo) return false;
    
    setIsDownloading(true);
    setError(null);
    
    try {
      const success = await updater.downloadAndInstall((progress) => {
        setProgress(progress);
      });
      
      if (!success) {
        setError('Failed to download and install update');
      }
      
      return success;
    } catch (err) {
      const errorMessage = 'Failed to download and install update';
      setError(errorMessage);
      console.error('Update installation failed:', err);
      return false;
    } finally {
      setIsDownloading(false);
    }
  }, [updateInfo]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-check for updates on mount
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  return {
    updateInfo,
    isChecking,
    isDownloading,
    progress,
    error,
    checkForUpdates,
    downloadAndInstall,
    clearError,
    isUpdateAvailable: !!updateInfo,
  };
};
