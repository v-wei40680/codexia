import React from 'react';
import { Button } from '../ui/button';
import { Paperclip, Image, Music, Clipboard } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useChatInputStore } from '@/stores/chatInputStore';
import { isMediaFile, createMediaAttachment } from '@/utils/mediaUtils';
import { open } from '@tauri-apps/plugin-dialog';
import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { appCacheDir } from '@tauri-apps/api/path';

export const MediaSelector: React.FC = () => {
  const { addMediaAttachment } = useChatInputStore();

  const handlePasteFromClipboard = async () => {
    try {
      // Try to read image from clipboard
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            
            // Create a temporary file name
            const timestamp = Date.now();
            const extension = type.split('/')[1] || 'png';
            const fileName = `clipboard-${timestamp}.${extension}`;
            
            // Convert blob to array buffer
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Write to temp directory
            const tempPath = `temp/${fileName}`;
            await writeFile(tempPath, uint8Array, { baseDir: BaseDirectory.AppCache });
            
            // Get the full path for the media attachment
            const fullPath = `${await appCacheDir()}/temp/${fileName}`;
            
            // Create media attachment
            const mediaAttachment = await createMediaAttachment(fullPath);
            addMediaAttachment(mediaAttachment);
            
            console.log('📋 Clipboard image added:', mediaAttachment);
            return;
          }
        }
      }
      
      console.warn('No image found in clipboard');
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  };

  const handleSelectMedia = async () => {
    try {
      const selected: string | string[] | null = await open({
        multiple: true,
        filters: [
          {
            name: 'Media Files',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']
          },
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
          },
          {
            name: 'Audio',
            extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']
          }
        ]
      });

      if (selected) {
        if (Array.isArray(selected)) {
          for (const filePath of selected) {
            const filename = filePath.split(/[\\/]/).pop() || filePath;
            if (isMediaFile(filename)) {
              try {
                const mediaAttachment = await createMediaAttachment(filePath);
                addMediaAttachment(mediaAttachment);
              } catch (error) {
                console.error('Failed to create media attachment:', error);
              }
            }
          }
        } else {
          const filename = (selected as string).split(/[\\/]/).pop() || selected;
          if (isMediaFile(filename)) {
            try {
              const mediaAttachment = await createMediaAttachment(selected as string);
              addMediaAttachment(mediaAttachment);
            } catch (error) {
              console.error('Failed to create media attachment:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectMedia}
              className="h-8 w-8 p-0"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2 text-xs">
              <Paperclip className="w-3 h-3" />
              Add media files
              <span className="text-gray-400">•</span>
              <Image className="w-3 h-3" />
              <Music className="w-3 h-3" />
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePasteFromClipboard}
              className="h-8 w-8 p-0"
            >
              <Clipboard className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2 text-xs">
              <Clipboard className="w-3 h-3" />
              Paste image from clipboard
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};