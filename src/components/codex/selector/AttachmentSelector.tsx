import { PlusIcon, Globe, Image as ImageIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScreenshotPopover } from '@/components/codex/selector/ScreenshotPopover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useConfigStore } from '@/stores/codex';
import { cn } from '@/lib/utils';
import { open } from '@tauri-apps/plugin-dialog';

export interface AttachmentSelectorProps {
  onImagesSelected?: (paths: string[]) => void;
}

export function AttachmentSelector({ onImagesSelected }: AttachmentSelectorProps) {
  const { webSearchRequest, setWebSearch } = useConfigStore();

  const handleSelectImage = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
          },
        ],
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        if (onImagesSelected) {
          onImagesSelected(paths);
        }
      }
    } catch (error) {
      console.error('Failed to select image:', error);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <PlusIcon className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            className={cn(
              'justify-start gap-2 px-2 hover:bg-blue-500 hover:text-white transition-colors',
              webSearchRequest && 'bg-blue-100 text-blue-900'
            )}
            onClick={() => setWebSearch(!webSearchRequest)}
          >
            <Globe className="w-4 h-4" />
            <span className="flex-1 text-left">Web search</span>
            {webSearchRequest && <Check className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            className="justify-start gap-2 px-2 hover:bg-blue-500 hover:text-white transition-colors"
            onClick={handleSelectImage}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Add images</span>
          </Button>
          {/* Screenshot button */}
          <ScreenshotPopover
            onScreenshotTaken={(path) => {
              if (onImagesSelected) {
                onImagesSelected([path]);
              }
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
