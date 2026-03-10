import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus } from 'lucide-react';
import { useInputStore } from '@/stores/useInputStore';
import { SelectFilesMenuItem } from '@/components/codex/selector/AttachmentSelector';

export function CCAttachmentButton() {
  const [open, setOpen] = useState(false);
  const { appendFileLinks } = useInputStore();

  const handleSelectFiles = (paths: string[]) => {
    try {
      appendFileLinks(paths);
      setOpen(false);
    } catch (error) {
      console.error('Failed to select files:', error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Add Files"
        >
          <Plus className={`h-4 w-4 ${open ? 'text-primary' : ''}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-44 p-1">
        <SelectFilesMenuItem
          onFilesSelected={handleSelectFiles}
          onAfterSelect={() => setOpen(false)}
          className="h-8 w-full text-xs"
        />
      </PopoverContent>
    </Popover>
  );
}
