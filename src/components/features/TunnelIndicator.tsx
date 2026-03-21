import { Globe, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTunnel } from '@/hooks/useTunnel'
import { isTauri, isPhone } from '@/hooks/runtime'

export function TunnelIndicator() {
  const { status, loading, error, start, stop } = useTunnel()

  // Desktop only — mobile connects via useP2PConnection in App.tsx
  if (!isTauri() || isPhone) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          onClick={status.connected ? stop : start}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          {/* Status dot */}
          <span
            className={`absolute bottom-1 right-1 h-2 w-2 rounded-full border border-background ${
              status.connected ? 'bg-green-500' : 'bg-muted-foreground'
            }`}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        {error ? (
          <p className="text-destructive text-xs">{error}</p>
        ) : status.connected ? (
          <div className="space-y-1">
            <p className="font-medium text-xs">Tunnel active</p>
            <p className="text-muted-foreground font-mono text-xs break-all">{status.public_endpoint}</p>
            <p className="text-muted-foreground text-xs">Click to stop</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-medium text-xs">P2P off</p>
            <p className="text-muted-foreground text-xs">Click to start (iOS / bots direct connect)</p>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
