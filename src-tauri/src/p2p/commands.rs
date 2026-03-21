use super::P2PStatus;
#[cfg(feature = "desktop")]
use std::sync::OnceLock;
#[cfg(feature = "desktop")]
use tokio::sync::Mutex;

// ── Desktop: P2P server state ─────────────────────────────────────────────────

#[cfg(feature = "desktop")]
static P2P_SERVER: OnceLock<Mutex<Option<super::server::P2PServer>>> = OnceLock::new();

#[cfg(feature = "desktop")]
fn server_state() -> &'static Mutex<Option<super::server::P2PServer>> {
    P2P_SERVER.get_or_init(|| Mutex::new(None))
}

/// Start the P2P QUIC server, discover public endpoint via STUN, register in Supabase.
/// `jwt` = desktop owner's Supabase access_token.
#[cfg(all(feature = "desktop", feature = "tauri"))]
#[tauri::command]
pub async fn p2p_start(
    jwt: String,
    supabase_url: String,
    anon_key: String,
) -> Result<P2PStatus, String> {
    let mut guard = server_state().lock().await;
    if let Some(ref s) = *guard {
        return Ok(P2PStatus {
            connected: true,
            public_endpoint: Some(s.public_endpoint.to_string()),
        });
    }
    let server = super::server::start(jwt, supabase_url, anon_key).await?;
    let ep = server.public_endpoint.to_string();
    *guard = Some(server);
    Ok(P2PStatus { connected: true, public_endpoint: Some(ep) })
}

#[cfg(all(feature = "desktop", feature = "tauri"))]
#[tauri::command]
pub async fn p2p_stop() -> Result<(), String> {
    let mut guard = server_state().lock().await;
    if let Some(s) = guard.take() {
        s.endpoint.close(0u32.into(), b"stopped");
    }
    Ok(())
}

#[cfg(all(feature = "desktop", feature = "tauri"))]
#[tauri::command]
pub async fn p2p_status_cmd() -> P2PStatus {
    let guard = server_state().lock().await;
    match &*guard {
        Some(s) => P2PStatus {
            connected: true,
            public_endpoint: Some(s.public_endpoint.to_string()),
        },
        None => P2PStatus { connected: false, public_endpoint: None },
    }
}

// ── Mobile: P2P client stubs (quinn not available on mobile yet) ──────────────

#[cfg(all(feature = "tauri", not(feature = "desktop")))]
#[tauri::command]
pub async fn p2p_connect(_jwt: String, _desktop_endpoint: String) -> Result<P2PStatus, String> {
    Err("P2P not yet supported on mobile".into())
}

#[cfg(all(feature = "tauri", not(feature = "desktop")))]
#[tauri::command]
pub async fn p2p_disconnect() -> Result<(), String> {
    Ok(())
}
