import { Slash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { codexService } from '@/services/codexService';
import { useTranslation } from 'react-i18next';

interface SlashCommandsSelectorProps {
  currentThreadId: string | null;
}

export function SlashCommandsSelector({ currentThreadId }: SlashCommandsSelectorProps) {
  const { t } = useTranslation();
  const handleReview = async () => {
    let targetThreadId = currentThreadId;

    if (!targetThreadId) {
      try {
        const thread = await codexService.threadStart();
        targetThreadId = thread.id;
      } catch (error) {
        console.error('Failed to start thread for review:', error);
        return;
      }
    }

    try {
      await codexService.startReview({
        threadId: targetThreadId,
        target: { type: 'uncommittedChanges' },
        delivery: null,
      });
    } catch (error) {
      console.error('Failed to start review:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Slash className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('slashCommands.title')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleReview}>/{t('header.review')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
