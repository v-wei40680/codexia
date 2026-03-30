import { Globe, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { useTunnel } from '@/hooks/useTunnel'
import { isTauri, isPhone } from '@/hooks/runtime'
import { useSettingsStore } from '@/stores/settings/useSettingsStore'

interface TunnelIndicatorProps {
  variant?: 'icon' | 'switch'
}

export function TunnelIndicator({ variant = 'icon' }: TunnelIndicatorProps) {
  const { status, loading, error, start, stop } = useTunnel()
  const setP2pAutoStart = useSettingsStore((s) => s.setP2pAutoStart)

  const handleStart = () => { setP2pAutoStart(true); start() }
  const handleStop = () => { setP2pAutoStart(false); stop() }

  // Desktop only — mobile connects via useP2PConnection in App.tsx
  if (!isTauri() || isPhone) return null

  if (variant === 'switch') {
    return (
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-xs text-muted-foreground">Remote</span>
        <Switch
          checked={status.connected}
          onCheckedChange={(v) => v ? handleStart() : handleStop()}
          disabled={loading}
          className="scale-75 origin-right"
        />
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          onClick={status.connected ? handleStop : handleStart}
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
