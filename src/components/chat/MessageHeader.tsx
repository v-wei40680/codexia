import { Folder } from 'lucide-react';

interface MessageHeaderProps {
  workingDirectory?: string;
  conversationTitle?: string;
}

export const MessageHeader = ({ workingDirectory, conversationTitle }: MessageHeaderProps) => {
  if (!workingDirectory) {
    return null;
  }

  return (
    <div className="border-b bg-gray-50 px-4 py-2">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Folder className="w-4 h-4" />
        <span className="font-medium">Working Directory:</span>
        <span className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">
          {workingDirectory}
        </span>
      </div>
      {conversationTitle && (
        <div className="mt-1 text-xs text-gray-500">
          {conversationTitle}
        </div>
      )}
    </div>
  );
};