import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface ShellCommandProps {
  command: string;
}

export const ShellCommand = ({ command }: ShellCommandProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="group flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 hover:bg-muted/50 transition-colors">
      <code className="text-sm font-mono text-foreground flex-1 break-all">{command}</code>

      <button
        onClick={handleCopy}
        className="flex-shrink-0 p-1.5 rounded-md hover:bg-background/80 transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Copy command"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
};
