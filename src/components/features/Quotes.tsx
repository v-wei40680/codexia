import { useRandomQuote } from '@/hooks/useRandomQuote';
import { useWorkspaceStore } from '@/stores';
import { Card, CardContent } from '@/components/ui/card';

export function Quotes() {
  const { selectedAgent } = useWorkspaceStore();
  const quote = useRandomQuote(selectedAgent);

  return (
    <div className="m-auto flex flex-col items-center gap-4 w-full max-w-4xl px-6">
      {quote && (
        <Card>
          <CardContent>
            <p className="font-serif italic leading-relaxed whitespace-pre-wrap">{quote.content}</p>
            <p className="text-sm text-muted-foreground">{quote.author}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
