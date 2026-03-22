import { Loader2, MonitorOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isTauri, isDesktopTauri, isPhone } from '@/hooks/runtime'
import type { P2PConnState } from '@/hooks/useP2PConnection'

interface Props {
  state: P2PConnState
  error: string | null
  logs?: string[]
  retry: () => void
}

export function DesktopOfflineScreen({ state, error, logs, retry }: Props) {
  const isLoading = state === 'idle' || state === 'connecting'

  const title =
    state === 'idle'       ? 'Waiting for login…'       :
    state === 'connecting' ? 'Connecting to desktop…'   :
    state === 'offline'    ? 'Desktop offline'           :
                             'Connection failed'

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
      {isLoading ? (
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      ) : (
        <MonitorOff className="h-10 w-10 text-muted-foreground" />
      )}

      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {error && !isLoading && (
          <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
        )}
      </div>

      {!isLoading && (
        <Button size="sm" variant="outline" onClick={retry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      )}

      {!isLoading && (
        <p className="text-xs text-muted-foreground max-w-xs">
          Open Codexia on your Mac and click the{' '}
          <span className="font-mono">P2P</span> button in the sidebar to go online.
        </p>
      )}

      {import.meta.env.DEV && (
        <div className="w-full max-w-sm rounded border border-border bg-muted/50 p-2 text-left font-mono text-[10px] text-muted-foreground space-y-0.5">
          <p>isTauri: {String(isTauri())}</p>
          <p>isDesktopTauri: {String(isDesktopTauri())}</p>
          <p>isPhone: {String(isPhone)}</p>
          <p>invoke or api: {isDesktopTauri() ? 'invokeTauri' : 'HTTP API :7420'}</p>
        </div>
      )}

      {import.meta.env.DEV && logs && logs.length > 0 && (
        <div className="w-full max-w-sm mt-2 rounded border border-border bg-muted/50 p-2 text-left">
          {logs.map((l, i) => (
            <p key={i} className="font-mono text-[10px] text-muted-foreground leading-4 break-all">{l}</p>
          ))}
        </div>
      )}
    </div>
  )
}
