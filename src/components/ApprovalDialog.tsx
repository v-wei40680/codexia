import React from 'react';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';
import { ApprovalRequest } from '@/types/codex';

interface ApprovalDialogProps {
  pendingApproval: ApprovalRequest | null;
  onApproval: (approved: boolean) => void;
}

export const ApprovalDialog: React.FC<ApprovalDialogProps> = ({ 
  pendingApproval, 
  onApproval 
}) => {
  if (!pendingApproval) return null;

  return (
    <div className="flex-shrink-0 border-t bg-yellow-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-yellow-800">
            {pendingApproval.type === 'exec' ? 'Command Execution Request' : 'Code Patch Request'}
          </h3>
          {pendingApproval.type === 'exec' ? (
            <div className="mt-2">
              <p className="text-sm text-yellow-700">Command:</p>
              <code className="block bg-yellow-100 p-2 rounded text-sm mt-1">
                {pendingApproval.command}
              </code>
              <p className="text-xs text-yellow-600 mt-1">
                Working directory: {pendingApproval.cwd}
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-yellow-700">Files to be modified:</p>
              <ul className="list-disc list-inside text-sm text-yellow-600 mt-1">
                {pendingApproval.files?.map((file, idx) => (
                  <li key={idx}>{file}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onApproval(false)}
          >
            Deny
          </Button>
          <Button
            size="sm"
            onClick={() => onApproval(true)}
          >
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
};