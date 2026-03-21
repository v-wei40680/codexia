import { useState, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase'
import { p2pConnect } from '@/services/tauri/p2p'
import { getIsPhone } from '@/hooks/runtime'

export type P2PConnState = 'idle' | 'connecting' | 'connected' | 'offline' | 'error'

export function useP2PConnection() {
  const [state, setState] = useState<P2PConnState>('idle')
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    if (!await getIsPhone() || !supabase) return

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return // not logged in yet

    setState('connecting')
    setError(null)

    try {
      // Fetch the desktop's registered QUIC endpoint (written by Desktop P2P server)
      const { data, error: dbErr } = await supabase
        .from('peer_endpoints')
        .select('public_ip, public_port')
        .single()

      if (dbErr || !data) {
        setState('offline')
        setError('Desktop is offline — open Codexia on your desktop and enable P2P')
        return
      }

      const endpoint = `${data.public_ip}:${data.public_port}`
      await p2pConnect(session.access_token, endpoint)
      setState('connected')
    } catch (e) {
      setState('error')
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    // Attempt on mount (user may already be logged in)
    void connect()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void connect()
      if (event === 'SIGNED_OUT') { setState('idle'); setError(null) }
    })

    return () => subscription.unsubscribe()
  }, [connect])

  return { state, error, retry: connect }
}
