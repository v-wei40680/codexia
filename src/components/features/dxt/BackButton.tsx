import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BackButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      aria-label="Go back"
    >
      <ChevronLeft size={20} />
      <span>Back</span>
    </Button>
  );
}
