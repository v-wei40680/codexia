import React from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Send, Square } from 'lucide-react';
import { useChatInputStore } from '@/stores/chatInputStore';
import { MediaSelector } from './MediaSelector';
import { ModelSelector } from './ModelSelector';
import { ReasoningEffortSelector } from './ReasoningEffortSelector';
import { FileReferenceList } from './FileReferenceList';
import { MediaAttachmentList } from './MediaAttachmentList';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (messageData: string | { text: string; mediaAttachments?: any[] }) => void;
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

    // Pass media attachments along with the message
    const messageParts = {
      text: messageContent,
      mediaAttachments: mediaAttachments.length > 0 ? mediaAttachments : undefined
    };

    console.log("📤 ChatInput: Sending message parts:", messageParts);
    console.log("📸 Media attachments count:", mediaAttachments.length);
    
    onSendMessage(messageParts);
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
    <div className="flex-shrink-0 border-t p-4 bg-white">
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
          placeholder={placeholderOverride || "Ask Codex to do anything"}
          className={`min-h-[60px] max-h-[200px] pr-32 bg-gray-100 resize-none overflow-y-auto pb-8 ${
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
        
        {/* Media Selector - bottom left inside textarea */}
        <div className="absolute left-2 bottom-2">
          <MediaSelector />
        </div>
        
        {/* Reasoning Effort, Model Selector and Send Button - bottom right inside textarea */}
        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          <ModelSelector />
          <ReasoningEffortSelector />
          {isLoading ? (
            <Button
              onClick={handleStopStreaming}
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white h-8 w-8 p-0"
              variant="default"
            >
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || disabled}
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
