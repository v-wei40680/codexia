import { useState } from 'react';
import type { UserInput } from '@/bindings/v2';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Check, Copy } from 'lucide-react';
import { Markdown } from '@/components/Markdown';

type UserMessageItemProps = {
  content: Array<UserInput>;
};

export const UserMessageItem = ({ content }: UserMessageItemProps) => {
  const [copied, setCopied] = useState(false);
  const images = content.filter((m) => m.type === 'image').map((m) => m.url);
  const localImages = content
    .filter((m) => m.type === 'localImage')
    .map((m) => convertFileSrc(m.path));
  const text = content
    .filter((m) => m.type === 'text')
    .map((m) => m.text)
    .join('');

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

  return (
    <div className="flex justify-end">
      <div className="group flex flex-col items-end gap-1">
        <div className="flex flex-col gap-2 border rounded-md p-2 bg-gray-100 dark:bg-gray-700">
          {(images.length > 0 || localImages.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {images.map((src, index) => (
                <img
                  key={`remote-${index}`}
                  src={src}
                  alt={`Uploaded ${index + 1}`}
                  className="max-w-full max-h-48 rounded object-contain"
                />
              ))}
              {localImages.map((src, index) => (
                <img
                  key={`local-${index}`}
                  src={src}
                  alt={`Uploaded ${index + 1}`}
                  className="max-w-full max-h-48 rounded object-contain"
                />
              ))}
            </div>
          )}
          {text.length > 0 && <Markdown value={text} />}
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
    </div>
  );
};
