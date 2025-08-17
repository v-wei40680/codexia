import React from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Send, AtSign, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useChatInputStore } from '../../stores/chatInputStore';

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholderOverride?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  onInputChange,
  onSendMessage,
  disabled = false,
  isLoading = false,
  placeholderOverride,
}) => {
  const {
    fileReferences,
    removeFileReference,
    clearFileReferences,
  } = useChatInputStore();

  const generateSmartPrompt = (): string => {
    if (fileReferences.length === 0) return '';
    
    // Use the accurate isDirectory flag
    const directories = fileReferences.filter(ref => ref.isDirectory);
    const files = fileReferences.filter(ref => !ref.isDirectory);
    
    const filePaths = fileReferences.map(ref => ref.relativePath).join(' ');
    
    if (directories.length > 0 && files.length === 0) {
      return directories.length === 1 
        ? `Read this folder: ${filePaths}`
        : `Read these folders: ${filePaths}`;
    } else if (files.length > 0 && directories.length === 0) {
      return files.length === 1 
        ? `Read this file: ${filePaths}`
        : `Read these files: ${filePaths}`;
    } else {
      // Mixed files and folders
      return `Read these files and folders: ${filePaths}`;
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

    onSendMessage(messageContent);
    onInputChange('');
    clearFileReferences();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-shrink-0 border-t p-4 bg-white">
      {/* File references display */}
      {fileReferences.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 items-center">
          <AtSign className="w-4 h-4 text-gray-500" />
          {fileReferences.map((ref) => (
            <TooltipProvider key={ref.path}>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-gray-200"
                  >
                    <span>{ref.name}</span>
                    <X
                      className="w-3 h-3 hover:bg-gray-300 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFileReference(ref.path);
                      }}
                    />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{ref.relativePath}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFileReferences}
            className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
          >
            Clear all
          </Button>
        </div>
      )}
      
      <div className="flex gap-2">
        <Textarea
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholderOverride || "Type your message..."}
          className="flex-1 min-h-[40px] max-h-[120px]"
          disabled={disabled || isLoading}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading || disabled}
          size="sm"
          className="self-end"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};