import { useState, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase'
import { p2pStart, p2pStop, p2pStatus, type P2PStatus } from '@/services/tauri/p2p'
import { isTauri } from '@/services/tauri/shared'

// Re-export so TunnelIndicator keeps the same import shape
export type { P2PStatus as TunnelStatus }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export function useTunnel() {
  const [status, setStatus] = useState<P2PStatus>({ connected: false, public_endpoint: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Poll status every 30s
  useEffect(() => {
    if (!isTauri()) return
    p2pStatus().then(setStatus).catch(() => {})
    const id = setInterval(() => p2pStatus().then(setStatus).catch(() => {}), 30_000)
    return () => clearInterval(id)
  }, [])

  const start = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('not logged in')
      const s = await p2pStart(session.access_token, SUPABASE_URL, SUPABASE_ANON_KEY)
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
      await p2pStop()
      setStatus({ connected: false, public_endpoint: null })
    } finally {
      setLoading(false)
    }
  }, [])

  return { status, loading, error, start, stop }
}
