import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
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
    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {approvalRequest.type === 'exec' ? (
            <div>
              <code className="block bg-yellow-100 dark:bg-yellow-800/30 px-2 rounded text-sm">
                {approvalRequest.command}
              </code>
            </div>
          ) : approvalRequest.type === 'apply_patch' ? (
            <div>
              {approvalRequest.reason && (
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-1">Reason: {approvalRequest.reason}</p>
              )}
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-1">Changes:</p>
              <div className="bg-yellow-100 dark:bg-yellow-800/30 p-2 rounded text-sm max-h-64 overflow-y-auto">
                {approvalRequest.changes ? (
                  typeof approvalRequest.changes === 'string' ? (
                    <pre className="text-xs whitespace-pre-wrap">
                      {approvalRequest.changes}
                    </pre>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(approvalRequest.changes).map(([file, change]: [string, any], idx) => {
                        const rel = (p: string) => {
                          const root = approvalRequest.grant_root as string | undefined;
                          if (root && p.startsWith(root)) {
                            const trimmed = p.slice(root.length);
                            return trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
                          }
                          return p;
                        };
                        const header = rel(file);
                        let body = '';
                        if (change.update) {
                          const mv = change.update.move_path ? `Move to: ${rel(change.update.move_path)}\n` : '';
                          const diff = change.update.unified_diff || change.update.content || '';
                          body = `${mv}${diff}`.trim();
                        } else if (change.add) {
                          body = change.add.content || change.add.unified_diff || JSON.stringify(change.add, null, 2);
                        } else if (change.remove) {
                          body = change.remove.content || change.remove.unified_diff || JSON.stringify(change.remove, null, 2);
                        } else if (change.modify) {
                          body = change.modify.content || change.modify.unified_diff || JSON.stringify(change.modify, null, 2);
                        } else {
                          body = JSON.stringify(change, null, 2);
                        }
                        return (
                          <div key={idx} className="border-l-2 border-yellow-300 pl-2">
                            <div className="font-mono text-xs font-medium text-yellow-700 dark:text-yellow-300">
                              {header}
                            </div>
                            <pre className="text-[11px] mt-1 whitespace-pre-wrap text-yellow-700 dark:text-yellow-300">
                              {body}
                            </pre>
                          </div>
                        );
                      })}
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
          
          <div className="flex gap-2">
            {decision ? (
              <div className="flex items-center">
                {decision === 'approved' ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
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
                  Approve
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
