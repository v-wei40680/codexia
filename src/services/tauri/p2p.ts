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
 * Connect to the desktop Quinn server.
 * `desktopEndpoint` = "ip:port" — fetch this from Supabase before calling.
 *
 * After this returns, all fetch() calls to http://localhost:7420 will be
 * transparently tunnelled to the desktop over QUIC.
 */
export async function p2pConnect(
  jwt: string,
  desktopEndpoint: string,
): Promise<P2PStatus> {
  if (!isTauri()) throw new Error('p2p only available in Tauri app')
  return invokeTauri<P2PStatus>('p2p_connect', { jwt, desktopEndpoint })
}

export async function p2pDisconnect(): Promise<void> {
  if (!isTauri()) return
  return invokeTauri<void>('p2p_disconnect')
}
