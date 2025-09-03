import { CheckCircle, XCircle, Loader2, FileText, Edit3, Plus } from 'lucide-react';

interface ToolExecutionIndicatorProps {
  toolName: string;
  status: 'running' | 'completed' | 'failed';
  duration?: number;
  className?: string;
}

export function ToolExecutionIndicator({ 
  toolName, 
  status, 
  duration, 
  className = '' 
}: ToolExecutionIndicatorProps) {
  const getIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getToolIcon = () => {
    if (toolName.toLowerCase().includes('read')) {
      return <FileText className="w-3 h-3 text-gray-500" />;
    }
    if (toolName.toLowerCase().includes('edit')) {
      return <Edit3 className="w-3 h-3 text-gray-500" />;
    }
    if (toolName.toLowerCase().includes('write')) {
      return <Plus className="w-3 h-3 text-gray-500" />;
    }
    return null;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md border ${getStatusColor()} text-xs font-mono ${className}`}>
      {getIcon()}
      <div className="flex items-center gap-1">
        {getToolIcon()}
        <span>{toolName}</span>
      </div>
      {duration && status === 'completed' && (
        <span className="text-gray-500">({duration}ms)</span>
      )}
    </div>
  );
}