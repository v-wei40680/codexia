import { useApprovalStore } from '@/stores/codex';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export function ApprovalItem() {
  const { currentApproval, pendingApprovals, respondToApproval } = useApprovalStore();
  const [showDetails, setShowDetails] = useState(false);

  if (!currentApproval) return null;

  const isCommandExecution = currentApproval.type === 'commandExecution';

  const handleApprove = async () => {
    try {
      let decision: any = 'accept';
      if (
        currentApproval.type === 'commandExecution' &&
        currentApproval.proposedExecpolicyAmendment
      ) {
        decision = {
          acceptWithExecpolicyAmendment: {
            execpolicy_amendment: currentApproval.proposedExecpolicyAmendment,
          },
        };
      }
      await respondToApproval(currentApproval.requestId, isCommandExecution, decision);
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleApproveForSession = async () => {
    try {
      await respondToApproval(currentApproval.requestId, isCommandExecution, 'acceptForSession');
    } catch (error) {
      console.error('Failed to approve for session:', error);
    }
  };

  const handleDecline = async () => {
    try {
      await respondToApproval(currentApproval.requestId, isCommandExecution, 'decline');
    } catch (error) {
      console.error('Failed to decline:', error);
    }
  };

  return (
    <div className="rounded-md border bg-background p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <span className="font-medium">Approval Required</span>
          {pendingApprovals.length > 1 && (
            <Badge variant="secondary">{pendingApprovals.length} pending</Badge>
          )}
        </div>
        {(currentApproval.reason ||
          (currentApproval.type === 'commandExecution' &&
            (currentApproval.commandActions?.length ?? 0) > 0)) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="h-7"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show Details
              </>
            )}
          </Button>
        )}
      </div>

      {/* Main info - always visible */}
      <div className="grid gap-3 text-sm">
        {currentApproval.type === 'commandExecution' && currentApproval.command && (
          <div>
            <div className="font-medium mb-1">Command:</div>
            <div className="text-muted-foreground p-2 bg-muted rounded font-mono text-xs break-all">
              {currentApproval.command}
            </div>
          </div>
        )}

        {currentApproval.type === 'fileChange' && currentApproval.grantRoot && (
          <div>
            <div className="font-medium mb-1">File Access Request:</div>
            <div className="text-muted-foreground p-2 bg-muted rounded">
              <div className="text-xs mb-1">
                Allow file writes under:
              </div>
              <div className="font-mono text-xs break-all">{currentApproval.grantRoot}</div>
            </div>
          </div>
        )}

        {currentApproval.type === 'commandExecution' &&
          currentApproval.proposedExecpolicyAmendment && (
            <div>
              <div className="font-medium mb-1 flex items-center gap-2">
                <span>Policy Amendment</span>
                <Badge variant="secondary" className="text-xs">Will skip future approvals</Badge>
              </div>
              <div className="text-muted-foreground p-2 bg-muted rounded font-mono text-xs break-all">
                {currentApproval.proposedExecpolicyAmendment.join(' ')}
              </div>
            </div>
          )}
      </div>

      {/* Collapsible details */}
      {showDetails && (
        <div className="grid gap-3 text-sm pt-2 border-t">
          {currentApproval.reason && (
            <div>
              <div className="font-medium mb-1">Reason:</div>
              <div className="text-muted-foreground p-2 bg-muted rounded text-xs">
                {currentApproval.reason}
              </div>
            </div>
          )}

          {currentApproval.type === 'commandExecution' &&
            currentApproval.commandActions &&
            currentApproval.commandActions.length > 0 && (
              <div>
                <div className="font-medium mb-1">Actions Summary:</div>
                <div className="space-y-1">
                  {currentApproval.commandActions.map((action, idx) => (
                    <div key={idx} className="text-muted-foreground p-2 bg-muted rounded text-xs">
                      <div className="font-medium text-foreground">
                        {action.type === 'read' && `📖 Read: ${action.name}`}
                        {action.type === 'listFiles' && '📁 List Files'}
                        {action.type === 'search' && '🔍 Search'}
                        {action.type === 'unknown' && '❓ Unknown Action'}
                      </div>
                      {action.type === 'read' && action.path && (
                        <div className="mt-1 font-mono opacity-70">{action.path}</div>
                      )}
                      {action.type === 'search' && action.query && (
                        <div className="mt-1">Query: {action.query}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button variant="outline" onClick={handleDecline} className="flex-1">
          Decline
        </Button>
        <Button variant="secondary" onClick={handleApproveForSession} className="flex-1">
          Approve for Session
        </Button>
        <Button onClick={handleApprove} className="flex-1">
          Approve Once
        </Button>
      </div>
    </div>
  );
}
