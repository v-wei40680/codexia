import React, { useState } from 'react';
import { Button } from '../ui/button';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ApprovalRequest } from '@/types/codex';

interface ApprovalMessageProps {
  approvalRequest: ApprovalRequest;
  onApproval: (approved: boolean) => void;
}

export const ApprovalMessage: React.FC<ApprovalMessageProps> = ({ 
  approvalRequest, 
  onApproval 
}) => {
  const [decision, setDecision] = useState<'approved' | 'denied' | null>(null);

  const handleApproval = (approved: boolean) => {
    setDecision(approved ? 'approved' : 'denied');
    onApproval(approved);
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800/50 my-2">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            {approvalRequest.type === 'exec' 
              ? '' 
              : approvalRequest.type === 'apply_patch' 
              ? 'Apply Code Changes Request' 
              : 'Code Patch Request'
            }
          </h3>
          
          {approvalRequest.type === 'exec' ? (
            <div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-1">Command:</p>
              <code className="block bg-yellow-100 dark:bg-yellow-800/30 p-2 rounded text-sm mb-2">
                {approvalRequest.command}
              </code>
            </div>
          ) : approvalRequest.type === 'apply_patch' ? (
            <div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-1">Changes to be applied:</p>
              <div className="bg-yellow-100 dark:bg-yellow-800/30 p-2 rounded text-sm max-h-40 overflow-y-auto">
                {approvalRequest.changes ? (
                  typeof approvalRequest.changes === 'string' ? (
                    <pre className="text-xs whitespace-pre-wrap">
                      {approvalRequest.changes}
                    </pre>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(approvalRequest.changes).map(([file, change]: [string, any], idx) => (
                        <div key={idx} className="border-l-2 border-yellow-300 pl-2">
                          <div className="font-mono text-xs font-medium text-yellow-700 dark:text-yellow-300">
                            {file}
                          </div>
                          <pre className="text-xs mt-1 whitespace-pre-wrap text-yellow-600 dark:text-yellow-400">
                            {change.add ? `+ ${change.add.content}` : 
                             change.remove ? `- ${change.remove.content}` :
                             change.modify ? `~ ${change.modify.content}` :
                             JSON.stringify(change, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">No change details available</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-1">Files to be modified:</p>
              <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400">
                {approvalRequest.files?.map((file, idx) => (
                  <li key={idx}>{file}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex gap-2 mt-3">
            {decision ? (
              <div className="flex items-center gap-2">
                {decision === 'approved' ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Request Approved
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">
                      Request Denied
                    </span>
                  </>
                )}
              </div>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleApproval(false)}
                >
                  Deny
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApproval(true)}
                >
                  Allow
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};