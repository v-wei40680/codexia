import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AccountLoginCompletedNotification } from '@/bindings/v2';
import { GetAccountResponse } from '@/bindings/v2';
import type { ServerNotification } from '@/bindings/ServerNotification';
import { open } from '@tauri-apps/plugin-shell';
import { getAccountWithParams, loginAccount } from '@/services';

const REFRESH_LABEL = 'Refresh account';
const REFRESH_FORCE_LABEL = 'Force refresh';
const LOGIN_LABEL = 'Start ChatGPT login';

export function CodexAuth() {
  const [account, setAccount] = useState<GetAccountResponse | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const runAction = useCallback(async (label: string, action: () => Promise<void>) => {
    setPendingAction(label);
    setLastStatus(label);
    setLastError(null);
    try {
      await action();
      setLastStatus(`${label} succeeded`);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error ?? 'Unknown');
      setLastStatus(`${label} failed`);
      setLastError(message);
    } finally {
      setPendingAction(null);
    }
  }, []);

  const refreshAccount = useCallback(
    (force: boolean) =>
      runAction(force ? REFRESH_FORCE_LABEL : REFRESH_LABEL, async () => {
        const response = await getAccountWithParams({
          refreshToken: force,
        });
        setAccount(response);
      }),
    [runAction]
  );

  const startChatLogin = useCallback(() => {
    runAction(LOGIN_LABEL, async () => {
      const response = await loginAccount({
        type: 'chatgpt',
      });
      if (response.type === 'chatgpt') {
        await open(response.authUrl);
      }
    });
  }, [runAction]);

  useEffect(() => {
    refreshAccount(false);
  }, [refreshAccount]);

  useEffect(() => {
    const unlistenPromise = listen<ServerNotification>('codex:notification', (event) => {
      const { method, params } = event.payload;
      if (method === 'account/updated') {
        refreshAccount(true);
        return;
      }
      if (method === 'account/login/completed') {
        const payload = params as AccountLoginCompletedNotification;
        if (payload.success) {
          refreshAccount(true);
        }
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [refreshAccount]);

  const buttonLabel = (label: string) => (pendingAction === label ? `${label}…` : label);
  const isBusy = Boolean(pendingAction);

  const accountType = account?.account?.type ?? 'none';

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle>Codex auth</CardTitle>
        <CardDescription>
          Exercise `codex app-server` auth calls so the UI can observe `requires_openai_auth`.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>requires_openai_auth:</span>
          <Badge variant={account?.requiresOpenaiAuth ? 'destructive' : 'secondary'}>
            {account?.requiresOpenaiAuth ? 'true' : 'false'}
          </Badge>
        </div>
        <div>
          <span className="font-semibold text-foreground">Account type:</span> {accountType}
        </div>
        {account?.account?.type === 'chatgpt' && (
          <div className="space-y-1">
            <p>Email: {account.account.email}</p>
            <p>Plan: {account.account.planType}</p>
          </div>
        )}
        {lastStatus && (
          <p className={`text-xs ${lastError ? 'text-destructive' : 'text-muted-foreground'}`}>
            {lastStatus}
          </p>
        )}
        {lastError && <p className="text-xs text-destructive">Error: {lastError}</p>}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button onClick={() => refreshAccount(false)} disabled={isBusy}>
          {buttonLabel(REFRESH_LABEL)}
        </Button>
        <Button variant="outline" onClick={() => refreshAccount(true)} disabled={isBusy}>
          {buttonLabel(REFRESH_FORCE_LABEL)}
        </Button>
        <Button variant="secondary" onClick={startChatLogin} disabled={isBusy}>
          {buttonLabel(LOGIN_LABEL)}
        </Button>
      </CardFooter>
    </Card>
  );
}
