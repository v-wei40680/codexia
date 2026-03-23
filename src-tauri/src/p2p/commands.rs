use super::P2PStatus;
use std::sync::OnceLock;
use tokio::sync::Mutex;

// ── Desktop server state ──────────────────────────────────────────────────────

#[cfg(feature = "desktop")]
static P2P_SERVER: OnceLock<Mutex<Option<super::server::P2PServer>>> = OnceLock::new();


#[cfg(feature = "desktop")]
fn server_state() -> &'static Mutex<Option<super::server::P2PServer>> {
    P2P_SERVER.get_or_init(|| Mutex::new(None))
}

// ── Mobile client state ───────────────────────────────────────────────────────

#[cfg(not(feature = "desktop"))]
static P2P_CLIENT: OnceLock<Mutex<Option<super::client::P2PClient>>> = OnceLock::new();

#[cfg(not(feature = "desktop"))]
fn client_state() -> &'static Mutex<Option<super::client::P2PClient>> {
    P2P_CLIENT.get_or_init(|| Mutex::new(None))
}

#[cfg(not(feature = "desktop"))]
static P2P_STUN_SOCK: OnceLock<Mutex<Option<std::net::UdpSocket>>> = OnceLock::new();

#[cfg(not(feature = "desktop"))]
fn stun_sock_state() -> &'static Mutex<Option<std::net::UdpSocket>> {
    P2P_STUN_SOCK.get_or_init(|| Mutex::new(None))
}

// ── Desktop commands (stubs on mobile) ───────────────────────────────────────

#[tauri::command]
pub async fn p2p_start(
    app: tauri::AppHandle,
    jwt: String,
    supabase_url: String,
    anon_key: String,
) -> Result<P2PStatus, String> {
    #[cfg(feature = "desktop")]
    {
        let mut guard = server_state().lock().await;
        if let Some(ref s) = *guard {
            return Ok(P2PStatus {
                connected: true,
                public_endpoint: Some(s.public_endpoint.to_string()),
            });
        }

        // Build and store the in-process axum router before starting the QUIC server.
        // The router dispatches mobile HTTP requests without opening any TCP port.
        #[cfg(feature = "tauri")]
        if super::router_handle::get().is_none() {
            use std::sync::Arc;
            use tauri::Manager;
            use tokio::sync::broadcast;
            use crate::web_server::{WebServerState, create_router};
            use crate::features::sleep::SleepState;
            use crate::web_server::terminal::WebTerminalState;
            use crate::web_server::filesystem_watch::WebWatchState;

            let codex_state = Arc::new(
                app.try_state::<crate::codex::AppState>()
                    .ok_or("codex not initialized")?
                    .inner()
                    .clone(),
            );
            let cc_state = Arc::new(app.state::<crate::cc::CCState>().inner().clone());
            let (event_tx, _) = broadcast::channel::<(String, serde_json::Value)>(256);
            // Register the event bridge so TauriEventSink forwards desktop events to mobile.
            crate::features::p2p_bridge::register(event_tx.clone());

            let state = WebServerState {
                codex_state,
                cc_state,
                sleep_state: Arc::new(SleepState::default()),
                terminal_state: Arc::new(WebTerminalState::default()),
                fs_watch_state: Arc::new(WebWatchState::default()),
                event_tx,
            };
            let router = create_router(state);
            super::router_handle::init(router.clone());
            // WebSocket upgrades require a real TCP connection; start a loopback-only
            // listener on an OS-assigned port exclusively for WS traffic.
            super::router_handle::start_ws_listener(router).await;
        }

        let server = super::server::start(jwt, supabase_url, anon_key).await?;
        let ep = server.public_endpoint.to_string();
        *guard = Some(server);
        return Ok(P2PStatus { connected: true, public_endpoint: Some(ep) });
    }
    #[cfg(not(feature = "tauri"))]
    let _ = app;
    #[cfg(not(feature = "desktop"))]
    {
        let _ = (app, jwt, supabase_url, anon_key);
        Err("p2p server not available on mobile".into())
    }
}

#[tauri::command]
pub async fn p2p_stop() -> Result<(), String> {
    #[cfg(feature = "desktop")]
    {
        let mut guard = server_state().lock().await;
        if let Some(s) = guard.take() {
            s.endpoint.close(0u32.into(), b"stopped");
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn p2p_status_cmd() -> P2PStatus {
    #[cfg(feature = "desktop")]
    {
        let guard = server_state().lock().await;
        return match &*guard {
            Some(s) => P2PStatus {
                connected: true,
                public_endpoint: Some(s.public_endpoint.to_string()),
            },
            None => P2PStatus { connected: false, public_endpoint: None },
        };
    }
    #[cfg(not(feature = "desktop"))]
    P2PStatus { connected: false, public_endpoint: None }
}

// ── Mobile commands (stubs on desktop) ───────────────────────────────────────

/// Step 1 — STUN: bind a UDP socket, discover phone's public endpoint, store socket.
/// Returns "ip:port". Register this in Supabase BEFORE calling p2p_connect so the
/// desktop punch_loop can open the home-router NAT in time.
#[tauri::command]
pub async fn p2p_stun() -> Result<String, String> {
    #[cfg(not(feature = "desktop"))]
    {
        let (public_addr, sock) = super::stun::discover_new_socket()?;
        *stun_sock_state().lock().await = Some(sock);
        return Ok(public_addr.to_string());
    }
    #[cfg(feature = "desktop")]
    Err("p2p_stun not used on desktop".into())
}

/// Step 2 — Connect: reuses the socket from p2p_stun, connects to desktop.
/// `timeout_secs`: override the default 30 s — pass a small value (e.g. 5) for
/// the cached fast-path so failures fall back quickly.
#[tauri::command]
pub async fn p2p_connect(
    jwt: String,
    desktop_endpoint: String,
    timeout_secs: Option<u64>,
) -> Result<P2PStatus, String> {
    #[cfg(not(feature = "desktop"))]
    {
        let mut guard = client_state().lock().await;
        if let Some(ref c) = *guard {
            return Ok(P2PStatus {
                connected: true,
                public_endpoint: Some(c.public_endpoint.to_string()),
            });
        }
        let sock = stun_sock_state().lock().await.take();
        let client = super::client::connect(jwt, desktop_endpoint, sock, timeout_secs).await?;
        let phone_public = client.public_endpoint.to_string();
        *guard = Some(client);
        return Ok(P2PStatus { connected: true, public_endpoint: Some(phone_public) });
    }
    #[cfg(feature = "desktop")]
    {
        let _ = (jwt, desktop_endpoint, timeout_secs);
        Err("p2p_connect not used on desktop".into())
    }
}

#[tauri::command]
pub async fn p2p_disconnect() -> Result<(), String> {
    #[cfg(not(feature = "desktop"))]
    {
        let mut guard = client_state().lock().await;
        if let Some(c) = guard.take() {
            c.connection.close(0u32.into(), b"disconnected");
        }
    }
    Ok(())
}
