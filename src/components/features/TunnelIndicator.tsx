import { useState } from 'react'
import { Loader2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { useTunnel } from '@/hooks/useTunnel'
import { isTauri, isPhone } from '@/hooks/runtime'
import { useSettingsStore } from '@/stores/settings/useSettingsStore'
import supabase from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function TunnelIndicator() {
  const { status, loading, start, stop } = useTunnel()
  const setP2pAutoStart = useSettingsStore((s) => s.setP2pAutoStart)
  const [starting, setStarting] = useState(false)

  // Desktop only — mobile connects via useP2PConnection in App.tsx
  if (!isTauri() || isPhone) return null

  const handleStart = async () => {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.info('Please log in to enable remote tunnel')
        return
      }
    }
    setP2pAutoStart(true)
    setStarting(true)
    await start()
    setStarting(false)
  }

  const handleStop = () => { setP2pAutoStart(false); stop() }

  return (
    <div className="flex items-center gap-1 px-1">
      {starting ? (
        <div className="flex h-7 w-7 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={status.connected ? "mobile disable" : "mobile enable"}
          disabled={loading}
          onClick={() => status.connected ? handleStop() : handleStart()}
        >
          <Smartphone
            className={cn(
              "h-4 w-4 transition-colors",
              status.connected ? "text-primary" : "text-muted-foreground"
            )}
          />
        </Button>
      )}
    </div>
  )
}
