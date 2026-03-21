import { Loader2, MonitorOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { P2PConnState } from '@/hooks/useP2PConnection'

interface Props {
  state: P2PConnState
  error: string | null
  retry: () => void
}

export function DesktopOfflineScreen({ state, error, retry }: Props) {
  const isConnecting = state === 'connecting'

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
      {isConnecting ? (
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      ) : (
        <MonitorOff className="h-10 w-10 text-muted-foreground" />
      )}

      <div className="space-y-1">
        <p className="font-medium">
          {isConnecting ? 'Connecting to desktop…' : 'Desktop offline'}
        </p>
        {error && !isConnecting && (
          <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
        )}
      </div>

      {!isConnecting && (
        <Button size="sm" variant="outline" onClick={retry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      )}

      {!isConnecting && (
        <p className="text-xs text-muted-foreground max-w-xs">
          Open Codexia on your Mac and click the{' '}
          <span className="font-mono">P2P</span> button in the sidebar to go online.
        </p>
      )}
    </div>
  )
}
