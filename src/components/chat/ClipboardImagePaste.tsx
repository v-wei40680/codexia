import React, { useEffect } from 'react';
import { useChatInputStore } from '@/stores/chatInputStore';
import { createMediaAttachment } from '@/utils/mediaUtils';
import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';

interface ClipboardImagePasteProps {
  children: React.ReactNode;
}

export const ClipboardImagePaste: React.FC<ClipboardImagePasteProps> = ({ children }) => {
  const { addMediaAttachment } = useChatInputStore();

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Handle image from clipboard
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          
          const file = item.getAsFile();
          if (!file) continue;

          try {
            // Create a temporary file name
            const timestamp = Date.now();
            const extension = item.type.split('/')[1] || 'png';
            const fileName = `clipboard-${timestamp}.${extension}`;
            
            // Convert file to array buffer
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Write to temp directory
            const tempPath = `temp/${fileName}`;
            await writeFile(tempPath, uint8Array, { baseDir: BaseDirectory.AppCache });
            
            // Get the full path for the media attachment
            const { appCacheDir } = await import('@tauri-apps/api/path');
            const fullPath = `${await appCacheDir()}/temp/${fileName}`;
            
            // Create media attachment
            const mediaAttachment = await createMediaAttachment(fullPath);
            addMediaAttachment(mediaAttachment);
            
            console.log('📋 Clipboard image added:', mediaAttachment);
          } catch (error) {
            console.error('Failed to process clipboard image:', error);
          }
        }
      }
    };

    // Add event listener to document
    document.addEventListener('paste', handlePaste);
    
    // Cleanup
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [addMediaAttachment]);

  return <>{children}</>;
};