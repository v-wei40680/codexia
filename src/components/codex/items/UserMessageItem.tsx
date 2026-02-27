import { useState } from 'react';
import type { UserInput } from '@/bindings/v2';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Check, Copy, Pencil } from 'lucide-react';
import { Markdown } from '@/components/Markdown';
import { codexService } from '@/services/codexService';
import { useInputStore } from '@/stores';
import { useEventPreferencesStore } from '@/stores/codex';
import { toast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/utils/errorUtils';
import { EditRollbackConfirmDialog } from './EditRollbackConfirmDialog';

type UserMessageItemProps = {
  content: Array<UserInput>;
  onEdit?: (text: string) => void | Promise<void>;
  editDisabled?: boolean;
};

export const UserMessageItem = ({ content, onEdit, editDisabled = false }: UserMessageItemProps) => {
  const [copied, setCopied] = useState(false);
  const images = content.filter((m) => m.type === 'image').map((m) => m.url);
  const localImages = content
    .filter((m) => m.type === 'localImage')
    .map((m) => convertFileSrc(m.path));
  const text = content
    .filter((m) => m.type === 'text')
    .map((m) => m.text)
    .join('');
  const canEdit = !!onEdit && text.length > 0 && !editDisabled;

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

  const handleEdit = async () => {
    if (!canEdit || !onEdit) return;
    await onEdit(text);
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
          {onEdit && (
            <button
              type="button"
              onClick={handleEdit}
              disabled={!canEdit}
              aria-label="Edit message"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
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

type EditableUserMessageItemProps = {
  content: Array<UserInput>;
  threadId: string;
  rollbackTurns: number;
};

export const EditableUserMessageItem = ({
  content,
  threadId,
  rollbackTurns,
}: EditableUserMessageItemProps) => {
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { hasConfirmedEditRollback, setHasConfirmedEditRollback } = useEventPreferencesStore();

  const applyEdit = async (text: string) => {
    if (rollbackTurns > 0) {
      await codexService.threadRollback(threadId, rollbackTurns);
    }
    useInputStore.getState().setInputValue(text);
  };

  const handleEdit = async (text: string) => {
    try {
      if (hasConfirmedEditRollback) {
        await applyEdit(text);
        return;
      }
      setPendingText(text);
    } catch (error) {
      console.error('Failed to edit from user message:', error);
      toast.error('Failed to edit message', {
        description: getErrorMessage(error),
      });
    }
  };

  const handleConfirmEdit = async () => {
    if (!pendingText) return;
    try {
      setSubmitting(true);
      await applyEdit(pendingText);
      setHasConfirmedEditRollback(true);
      setPendingText(null);
    } catch (error) {
      console.error('Failed to edit from user message:', error);
      toast.error('Failed to edit message', {
        description: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <UserMessageItem content={content} editDisabled={false} onEdit={handleEdit} />
      <EditRollbackConfirmDialog
        open={pendingText !== null}
        submitting={submitting}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setPendingText(null);
          }
        }}
        onConfirm={() => {
          void handleConfirmEdit();
        }}
      />
    </>
  );
};
