import { useState, useEffect, useCallback, useRef } from 'react'
import supabase from '@/lib/supabase'
import { p2pStun, p2pConnect } from '@/services/tauri/p2p'
import { getIsPhone } from '@/hooks/runtime'

export type P2PConnState = 'idle' | 'connecting' | 'connected' | 'offline' | 'error'

export function useP2PConnection() {
  const [state, setState] = useState<P2PConnState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const connecting = useRef(false)

  const log = (msg: string) => {
    console.log('[p2p]', msg)
    if (import.meta.env.DEV) setLogs(prev => [...prev.slice(-49), `${new Date().toISOString().slice(11, 23)} ${msg}`])
  }

  const connect = useCallback(async () => {
    if (connecting.current) { log('already connecting, skipping'); return }
    connecting.current = true
    const isPhone = await getIsPhone()
    if (!isPhone || !supabase) { connecting.current = false; return }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) { log('no session'); connecting.current = false; return }

    setState('connecting')
    setError(null)
    if (import.meta.env.DEV) setLogs([])

    try {
      log('fetching desktop endpoint from DB…')
      const { data, error: dbErr } = await supabase
        .from('peer_endpoints')
        .select('public_ip, public_port, local_ip, local_port')
        .eq('user_id', session.user.id)
        .single()

      if (dbErr || !data) {
        log(`DB error: ${dbErr?.message ?? 'no row'}`)
        setState('offline')
        setError('Desktop is offline — open Codexia on your desktop and enable P2P')
        return
      }
      log(`desktop: public=${data.public_ip}:${data.public_port} local=${data.local_ip}:${data.local_port}`)

      // Step 1: STUN — bind socket, get phone's public endpoint immediately.
      log('running STUN…')
      const phoneEndpoint = await p2pStun()
      const phonePublicIp = phoneEndpoint.split(':')[0]
      log(`phone STUN endpoint: ${phoneEndpoint}`)

      // Same public IP = same LAN (hairpin NAT won't work) → use desktop's LAN IP + local port.
      // Must use local_port (e.g. 7422), NOT public_port (which is the NAT-mapped external port).
      const sameLan = data.local_ip && data.local_port && phonePublicIp === data.public_ip
      const desktopEndpoint = sameLan
        ? `${data.local_ip}:${data.local_port}`
        : `${data.public_ip}:${data.public_port}`
      log(`sameLan=${sameLan} → connecting to ${desktopEndpoint}`)

      const [phoneIp, phonePortStr] = phoneEndpoint.split(':')

      // Step 2: Register phone endpoint so desktop's punch_loop sees it.
      log('registering phone endpoint…')
      const { error: updateErr } = await supabase
        .from('peer_endpoints')
        .update({ phone_ip: phoneIp, phone_port: parseInt(phonePortStr, 10) })
        .eq('user_id', session.user.id)
      if (updateErr) throw new Error(`Failed to register phone endpoint: ${updateErr.message}`)
      log('phone endpoint registered, waiting for punch…')

      // Step 3: Connect (30 s window). Desktop will punch back within ~1-2 s,
      // opening the home-router NAT so Quinn's retry gets through.
      log('calling p2pConnect…')
      await p2pConnect(session.access_token, desktopEndpoint)
      log('connected!')
      setState('connected')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      log(`error: ${msg}`)
      setState('error')
      setError(msg)
    } finally {
      connecting.current = false
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

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

  return { state, error, logs, retry: connect }
}
