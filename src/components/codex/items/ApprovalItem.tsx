import { useApprovalStore } from '@/stores/codex';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

export function ApprovalItem() {
  const { currentApproval, pendingApprovals, respondToApproval } = useApprovalStore();

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
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <span className="font-medium">Approval Required</span>
        {pendingApprovals.length > 1 && (
          <Badge variant="secondary">{pendingApprovals.length} pending</Badge>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        {isCommandExecution
          ? 'The agent wants to execute a command'
          : 'The agent wants to change files'}
      </div>

      <div className="grid gap-3 text-sm">
        {currentApproval.reason && (
          <div>
            <div className="font-medium">Reason:</div>
            <div className="text-muted-foreground p-2 bg-muted rounded">
              {currentApproval.reason}
            </div>
          </div>
        )}

        {currentApproval.type === 'commandExecution' && currentApproval.command && (
          <div>
            <div className="font-medium">Command:</div>
            <div className="text-muted-foreground p-2 bg-muted rounded font-mono break-all">
              {currentApproval.command}
            </div>
          </div>
        )}

        {currentApproval.type === 'commandExecution' && currentApproval.cwd && (
          <div>
            <div className="font-medium">Working Directory:</div>
            <div className="text-muted-foreground p-2 bg-muted rounded font-mono break-all">
              {currentApproval.cwd}
            </div>
          </div>
        )}

        {currentApproval.type === 'commandExecution' &&
          currentApproval.commandActions &&
          currentApproval.commandActions.length > 0 && (
            <div>
              <div className="font-medium">Command Actions:</div>
              <div className="space-y-2">
                {currentApproval.commandActions.map((action, idx) => (
                  <div key={idx} className="text-muted-foreground p-2 bg-muted rounded">
                    <div className="font-medium text-foreground">
                      {action.type === 'read' && `Read: ${action.name}`}
                      {action.type === 'listFiles' && 'List Files'}
                      {action.type === 'search' && 'Search'}
                      {action.type === 'unknown' && 'Unknown Action'}
                    </div>
                    {action.type === 'read' && (
                      <div className="text-xs mt-1">Path: {action.path}</div>
                    )}
                    {action.type === 'listFiles' && action.path && (
                      <div className="text-xs mt-1">Path: {action.path}</div>
                    )}
                    {action.type === 'search' && (
                      <>
                        {action.query && <div className="text-xs mt-1">Query: {action.query}</div>}
                        {action.path && <div className="text-xs">Path: {action.path}</div>}
                      </>
                    )}
                    <div className="text-xs mt-1 font-mono">{action.command}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {currentApproval.type === 'commandExecution' &&
          currentApproval.proposedExecpolicyAmendment && (
            <div>
              <div className="font-medium">Proposed Policy Amendment:</div>
              <div className="text-muted-foreground p-2 bg-muted rounded">
                <div className="text-xs mb-1">
                  Allowing this will permit similar commands without approval:
                </div>
                <div className="font-mono text-xs break-all">
                  {currentApproval.proposedExecpolicyAmendment.join(' ')}
                </div>
              </div>
            </div>
          )}

        {currentApproval.type === 'fileChange' && currentApproval.grantRoot && (
          <div>
            <div className="font-medium">Grant Root Access:</div>
            <div className="text-muted-foreground p-2 bg-muted rounded">
              <div className="text-xs mb-1">
                This will allow file writes under this directory for the session:
              </div>
              <div className="font-mono break-all">{currentApproval.grantRoot}</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={handleDecline}>
          Decline
        </Button>
        <Button variant="secondary" onClick={handleApproveForSession}>
          Approve for Session
        </Button>
        <Button onClick={handleApprove}>Approve Once</Button>
      </div>
    </div>
  );
}
