import { useState, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase'
import { tunnelStart, tunnelStop, tunnelStatus, type TunnelStatus } from '@/services/tauri/tunnel'
import { isTauri } from '@/services/tauri/shared'

export function useTunnel() {
  const [status, setStatus] = useState<TunnelStatus>({ connected: false, url: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Poll status every 30s
  useEffect(() => {
    if (!isTauri()) return
    tunnelStatus().then(setStatus)
    const id = setInterval(() => tunnelStatus().then(setStatus), 30_000)
    return () => clearInterval(id)
  }, [])

  const start = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('not logged in')
      const s = await tunnelStart(session.access_token)
      setStatus(s)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const stop = useCallback(async () => {
    setLoading(true)
    try {
      await tunnelStop()
      setStatus({ connected: false, url: null })
    } finally {
      setLoading(false)
    }
  }, [])

  return { status, loading, error, start, stop }
}
