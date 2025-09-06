import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { updater, UpdateInfo, UpdateProgress } from './updater';

export const UpdaterComponent: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress>({ downloaded: 0, total: 0, percentage: 0 });
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const update = await updater.checkForUpdates();
      setUpdateInfo(update);
    } catch (err) {
      setError('Failed to check for updates');
      console.error('Update check failed:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    if (!updateInfo) return;
    
    setIsDownloading(true);
    setError(null);
    
    try {
      const success = await updater.downloadAndInstall((progress) => {
        setProgress(progress);
      });
      
      if (!success) {
        setError('Failed to download and install update');
      }
    } catch (err) {
      setError('Failed to download and install update');
      console.error('Update installation failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Check for updates on component mount
  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          App Updater
        </CardTitle>
        <CardDescription>
          Check for and install application updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {updateInfo ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Update Available</p>
                <p className="text-sm text-muted-foreground">
                  Version {updateInfo.version}
                </p>
              </div>
              <Badge variant="secondary">
                {new Date(updateInfo.date).toLocaleDateString()}
              </Badge>
            </div>

            {updateInfo.body && (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Release Notes:</p>
                <p className="whitespace-pre-wrap">{updateInfo.body}</p>
              </div>
            )}

            {isDownloading ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Downloading update...</span>
                  <span>{progress.percentage.toFixed(1)}%</span>
                </div>
                <Progress value={progress.percentage} className="w-full" />
                <div className="text-xs text-muted-foreground">
                  {Math.round(progress.downloaded / 1024 / 1024)} MB / {Math.round(progress.total / 1024 / 1024)} MB
                </div>
              </div>
            ) : (
              <Button 
                onClick={downloadAndInstall}
                className="w-full"
                disabled={isDownloading}
              >
                <Download className="h-4 w-4 mr-2" />
                Download & Install Update
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <p className="font-medium">You're up to date!</p>
              <p className="text-sm text-muted-foreground">
                No updates available
              </p>
            </div>
            <Button 
              onClick={checkForUpdates}
              variant="outline"
              className="w-full"
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check for Updates
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpdaterComponent;
