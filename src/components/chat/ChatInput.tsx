import React from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ArrowUp, Square } from 'lucide-react';
import { useChatInputStore } from '@/stores/chatInputStore';
import { MediaSelector } from './MediaSelector';
import { ModelSelector } from './ModelSelector';
import { FileReferenceList } from './FileReferenceList';
import { MediaAttachmentList } from './MediaAttachmentList';
import { useSettingsStore } from '@/stores/SettingsStore';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (message: string) => void;
  onStopStreaming?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholderOverride?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  onInputChange,
  onSendMessage,
  onStopStreaming,
  disabled = false,
  isLoading = false,
  placeholderOverride,
}) => {
  const {
    fileReferences,
    mediaAttachments,
    removeFileReference,
    removeMediaAttachment,
    clearFileReferences,
    clearMediaAttachments,
  } = useChatInputStore();
  const { windowTitle } = useSettingsStore()

  const generateSmartPrompt = (): string => {
    if (fileReferences.length === 0) return '';
    return fileReferences.map(ref => ref.relativePath).join(' ');
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return;

    // Build message content with file references
    let messageContent = inputValue;
    if (fileReferences.length > 0) {
      const smartPrompt = generateSmartPrompt();
      messageContent = `${smartPrompt}\n\n${inputValue}`;
    }

    // NEW: Include image paths directly in the text message for view_image tool
    if (mediaAttachments.length > 0) {
      const imagePaths = mediaAttachments
        .filter(media => media.type === 'image')
        .map(media => media.path)
        .join(' ');
      
      if (imagePaths) {
        messageContent = `${messageContent}\n\n${imagePaths}`;
      }
      
      console.log("📸 Including image paths in text:", imagePaths);
    }

    // Send as simple text message - Agent will use view_image tool automatically
    console.log("📤 ChatInput: Sending text message with image paths:", messageContent);
    
    onSendMessage(messageContent);
    onInputChange('');
    clearFileReferences();
    clearMediaAttachments();
  };

  const handleStopStreaming = () => {
    if (onStopStreaming) {
      onStopStreaming();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // allow newline
        return;
      } else {
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  return (
    <div className="flex-shrink-0 border-t px-4 bg-background">
      <div className="relative">
        {/* File references and media attachments inside textarea */}
        {(fileReferences.length > 0 || mediaAttachments.length > 0) && (
          <div className="absolute top-2 left-3 right-32 z-10 flex flex-wrap gap-1 items-center mb-2 max-h-20 overflow-y-auto">
            {/* File references */}
            <FileReferenceList 
              fileReferences={fileReferences}
              onRemove={removeFileReference}
            />
            
            {/* Media attachments */}
            <MediaAttachmentList
              mediaAttachments={mediaAttachments}
              onRemove={removeMediaAttachment}
            />
          </div>
        )}
        
        <Textarea
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholderOverride || `Ask ${windowTitle == 'Codexia' ? "Codex" : windowTitle} to do anything`}
          className={`min-h-20 max-h-96 pr-32 bg-muted/50 resize-none overflow-y-auto pb-8 ${
            (fileReferences.length > 0 || mediaAttachments.length > 0) ? 'pt-8' : ''
          }`}
          disabled={false}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = '60px';
            const newHeight = Math.min(target.scrollHeight, 200);
            target.style.height = newHeight + 'px';
          }}
        />
        
        {/* Media Selector and Sandbox Selector - bottom left inside textarea */}
        <div className="flex absolute left-2 bottom-2 items-center gap-1">
          <MediaSelector />
        </div>

        {/* Model Selector and Send Button - bottom right inside textarea */}
        <div className="absolute right-4 bottom-2 flex items-center gap-1 group">
          <div className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <ModelSelector />
          </div>
          {isLoading ? (
            <Button
              onClick={handleStopStreaming}
              size="icon"
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-8 w-8 p-0"
              variant="default"
            >
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || disabled}
              size="icon"
              className="rounded-full w-6 h-6"
            >
              <ArrowUp />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
