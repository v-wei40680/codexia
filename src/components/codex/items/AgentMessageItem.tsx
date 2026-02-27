import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Markdown } from '@/components/Markdown';

type AgentMessageItemProps = {
  text: string;
};

export const AgentMessageItem = ({ text }: AgentMessageItemProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text.length) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!text.length) return null;

  return (
    <div className="group flex flex-col items-start gap-1">
      <div className="flex w-fit rounded-md border p-2">
        <Markdown value={text} />
      </div>
      <div
        className={`flex items-center gap-1 px-1 transition-opacity ${
          copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={handleCopy}
          disabled={!text.length}
          aria-label={copied ? 'Copied' : 'Copy message'}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};
