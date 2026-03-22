/// Holds the in-process axum Router used by the P2P QUIC server to dispatch HTTP
/// requests without opening a TCP port.
///
/// WebSocket upgrades require a real TCP connection (hyper limitation), so a
/// loopback-only listener is started on an OS-assigned port for those only.
use std::sync::OnceLock;
use axum::Router;

static P2P_ROUTER: OnceLock<Router> = OnceLock::new();
static WS_LOCAL_PORT: OnceLock<u16> = OnceLock::new();

/// Store the router for in-process use. No-op if already initialized.
pub fn init(router: Router) {
    let _ = P2P_ROUTER.set(router);
}

/// Return a clone of the stored router (cheap — axum::Router is Arc-backed).
pub fn get() -> Option<Router> {
    P2P_ROUTER.get().cloned()
}

/// Port of the loopback WebSocket listener (set by `start_ws_listener`).
pub fn ws_port() -> Option<u16> {
    WS_LOCAL_PORT.get().copied()
}

/// Bind a loopback TCP listener on port 0 and serve the router on it exclusively
/// for WebSocket upgrade requests. Returns the assigned port.
/// No-op and returns the existing port if already started.
pub async fn start_ws_listener(router: Router) -> u16 {
    if let Some(port) = WS_LOCAL_PORT.get() {
        return *port;
    }
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("failed to bind WS loopback listener");
    let port = listener.local_addr().expect("no local addr").port();
    let _ = WS_LOCAL_PORT.set(port);
    tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, router).await {
            log::error!("[p2p-router] WS listener error: {e}");
        }
    });
    port
}
