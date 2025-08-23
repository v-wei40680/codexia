import React from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Send, AtSign, X, Square, Image, Music } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useChatInputStore } from '@/stores/chatInputStore';
import { MediaSelector } from './MediaSelector';
import { ModelSelector } from './ModelSelector';

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
    
    // Use the accurate isDirectory flag
    const directories = fileReferences.filter(ref => ref.isDirectory);
    const files = fileReferences.filter(ref => !ref.isDirectory);
    
    const filePaths = fileReferences.map(ref => ref.relativePath).join(' ');
    
    if (directories.length > 0 && files.length === 0) {
      return directories.length === 1 
        ? `${filePaths}`
        : `${filePaths}`;
    } else if (files.length > 0 && directories.length === 0) {
      return files.length === 1 
        ? `${filePaths}`
        : `${filePaths}`;
    } else {
      // Mixed files and folders
      return `${filePaths}`;
    }
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-shrink-0 border-t p-4 bg-white">
      <div className="relative">
        {/* File references and media attachments inside textarea */}
        {(fileReferences.length > 0 || mediaAttachments.length > 0) && (
          <div className="absolute top-2 left-3 right-32 z-10 flex flex-wrap gap-1 items-center mb-2 max-h-20 overflow-y-auto">
            {/* File references */}
            {fileReferences.length > 0 && (
              <>
                <AtSign className="w-3 h-3 text-gray-400 flex-shrink-0" />
                {fileReferences.map((ref) => (
                  <TooltipProvider key={ref.path}>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 cursor-pointer hover:bg-gray-200 h-5 text-xs px-1.5 py-0"
                        >
                          <span>{ref.name}</span>
                          <button
                            className="ml-1 p-0.5 hover:bg-gray-300 rounded flex-shrink-0 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFileReference(ref.path);
                            }}
                            type="button"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{ref.relativePath}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </>
            )}
            
            {/* Media attachments */}
            {mediaAttachments.map((attachment) => (
              <TooltipProvider key={attachment.id}>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 h-5 text-xs px-1.5 py-0"
                    >
                      {attachment.type === 'image' ? (
                        <Image className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <Music className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                      )}
                      <span className="truncate max-w-12">{attachment.name}</span>
                      <button
                        className="ml-1 p-0.5 hover:bg-gray-300 rounded flex-shrink-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMediaAttachment(attachment.id);
                        }}
                        type="button"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p>{attachment.path}</p>
                      <p className="text-gray-500 mt-1">{attachment.type} • {attachment.mimeType}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            
            {/* Clear buttons */}
            {(fileReferences.length > 0 || mediaAttachments.length > 0) && (
              <div className="flex gap-1 ml-1">
                {fileReferences.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFileReferences}
                    className="h-4 px-1 text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear files
                  </Button>
                )}
                {mediaAttachments.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearMediaAttachments}
                    className="h-4 px-1 text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear media
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        
        <Textarea
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholderOverride || "Type your message..."}
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
        
        {/* Model Selector and Send Button - bottom right inside textarea */}
        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          <ModelSelector />
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
