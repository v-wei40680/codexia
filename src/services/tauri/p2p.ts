import { invokeTauri, isTauri } from './shared'

export interface P2PStatus {
  connected: boolean
  public_endpoint: string | null
}

// ── Desktop: server commands ──────────────────────────────────────────────────

export async function p2pStart(
  jwt: string,
  supabaseUrl: string,
  anonKey: string,
): Promise<P2PStatus> {
  if (!isTauri()) throw new Error('p2p only available in desktop app')
  return invokeTauri<P2PStatus>('p2p_start', {
    jwt,
    supabaseUrl,
    anonKey,
  })
}

export async function p2pStop(): Promise<void> {
  if (!isTauri()) return
  return invokeTauri<void>('p2p_stop')
}

export async function p2pStatus(): Promise<P2PStatus> {
  if (!isTauri()) return { connected: false, public_endpoint: null }
  return invokeTauri<P2PStatus>('p2p_status_cmd')
}

// ── Mobile: client commands ───────────────────────────────────────────────────

/**
 * Step 1 — STUN: bind a UDP socket, discover phone's public endpoint, store socket.
 * Returns "ip:port". Register this in Supabase BEFORE calling p2pConnect so the
 * desktop can punch back while Quinn retries.
 */
export async function p2pStun(): Promise<string> {
  if (!isTauri()) throw new Error('p2p only available in Tauri app')
  return invokeTauri<string>('p2p_stun')
}

/**
 * Step 2 — Connect: reuses the socket from p2pStun, connects to desktop with 30s timeout.
 * Desktop punches back during this window → Quinn retry succeeds.
 *
 * After this returns, all fetch() calls to http://localhost:7420 tunnel to the desktop.
 */
export async function p2pConnect(
  jwt: string,
  desktopEndpoint: string,
  timeoutSecs?: number,
): Promise<P2PStatus> {
  if (!isTauri()) throw new Error('p2p only available in Tauri app')
  return invokeTauri<P2PStatus>('p2p_connect', { jwt, desktopEndpoint, timeoutSecs })
}

export async function p2pDisconnect(): Promise<void> {
  if (!isTauri()) return
  return invokeTauri<void>('p2p_disconnect')
}

/** Set custom STUN servers that are tried before the built-in defaults. */
export async function p2pSetStunServers(servers: string[]): Promise<void> {
  if (!isTauri()) return
  return invokeTauri<void>('p2p_set_stun_servers', { servers })
}
