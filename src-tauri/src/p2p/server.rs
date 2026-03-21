/// Desktop P2P server: Quinn QUIC server that proxies HTTP and WebSocket to the local
/// web server (port 7420).  Only same-Supabase-account clients are allowed.
use std::net::SocketAddr;

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

/// UDP port the Quinn endpoint listens on.  Must match STUN discovery port.
pub const P2P_UDP_PORT: u16 = 7422;
const LOCAL_HTTP_PORT: u16 = 7420;

// ── Public handle ────────────────────────────────────────────────────────────

pub struct P2PServer {
    pub endpoint: quinn::Endpoint,
    pub public_endpoint: SocketAddr,
    _task: tokio::task::JoinHandle<()>,
}

// ── Entry point ──────────────────────────────────────────────────────────────

pub async fn start(
    host_jwt: String,
    supabase_url: String,
    anon_key: String,
) -> Result<P2PServer, String> {
    // Install ring crypto provider (no-op if already installed)
    let _ = rustls::crypto::ring::default_provider().install_default();

    // 1. STUN: discover what public endpoint the NAT assigns to our UDP port
    let public_endpoint = super::stun::discover(P2P_UDP_PORT)
        .map_err(|e| format!("STUN failed: {e}"))?;
    log::info!("[p2p-server] public endpoint: {public_endpoint}");

    // 2. Quinn server with self-signed TLS cert (auth is JWT-based, not cert-based)
    let server_config = make_server_config()?;
    let local_addr: SocketAddr =
        format!("0.0.0.0:{P2P_UDP_PORT}").parse().unwrap();
    let endpoint = quinn::Endpoint::server(server_config, local_addr)
        .map_err(|e| format!("Quinn endpoint: {e}"))?;

    // 3. Resolve desktop owner's user_id via Supabase
    let owner_user_id =
        verify_jwt(&host_jwt, &supabase_url, &anon_key).await?;
    log::info!("[p2p-server] owner user_id: {owner_user_id}");

    // 4. Register endpoint in Supabase so mobile can find it
    register_endpoint(&host_jwt, &supabase_url, &anon_key, &owner_user_id, public_endpoint).await?;
    log::info!("[p2p-server] endpoint registered in Supabase");

    // 5. Accept-loop in background
    let ep = endpoint.clone();
    let task = tokio::spawn(accept_loop(ep, owner_user_id, supabase_url, anon_key));

    Ok(P2PServer { endpoint, public_endpoint, _task: task })
}

// ── Accept loop ──────────────────────────────────────────────────────────────

async fn accept_loop(
    endpoint: quinn::Endpoint,
    owner_user_id: String,
    supabase_url: String,
    anon_key: String,
) {
    while let Some(incoming) = endpoint.accept().await {
        let owner = owner_user_id.clone();
        let su = supabase_url.clone();
        let ak = anon_key.clone();
        tokio::spawn(async move {
            match incoming.await {
                Ok(conn) => {
                    log::info!("[p2p-server] connection from {}", conn.remote_address());
                    handle_connection(conn, owner, su, ak).await;
                }
                Err(e) => log::warn!("[p2p-server] incoming error: {e}"),
            }
        });
    }
}

// ── Per-connection: auth then proxy ─────────────────────────────────────────

async fn handle_connection(
    conn: quinn::Connection,
    owner_user_id: String,
    supabase_url: String,
    anon_key: String,
) {
    // First bidi-stream = auth handshake
    let (mut tx, mut rx) = match conn.accept_bi().await {
        Ok(s) => s,
        Err(e) => { log::warn!("[p2p-server] accept_bi (auth): {e}"); return; }
    };

    // Read JWT line from client
    let jwt = match read_line(&mut rx, 8192).await {
        Ok(s) => s,
        Err(e) => { log::warn!("[p2p-server] JWT read: {e}"); return; }
    };

    // Verify JWT and check same user_id
    let client_uid = match verify_jwt(&jwt, &supabase_url, &anon_key).await {
        Ok(id) => id,
        Err(e) => {
            log::warn!("[p2p-server] JWT verify failed: {e}");
            let _ = tx.write_all(b"ERR auth\n").await;
            return;
        }
    };
    if client_uid != owner_user_id {
        log::warn!("[p2p-server] forbidden: {client_uid} != {owner_user_id}");
        let _ = tx.write_all(b"ERR forbidden\n").await;
        return;
    }

    log::info!("[p2p-server] auth OK — user {client_uid}");
    if tx.write_all(b"OK\n").await.is_err() { return; }
    drop((tx, rx)); // auth streams done

    // Proxy subsequent bidi-streams
    loop {
        match conn.accept_bi().await {
            Ok((send, recv)) => { tokio::spawn(proxy_stream(send, recv)); }
            Err(e) => { log::info!("[p2p-server] connection closed: {e}"); break; }
        }
    }
}

// ── HTTP / WebSocket proxy ───────────────────────────────────────────────────

async fn proxy_stream(send: quinn::SendStream, mut recv: quinn::RecvStream) {
    // Read HTTP headers (up to \r\n\r\n)
    let headers = match read_http_head(&mut recv).await {
        Ok(h) => h,
        Err(e) => { log::warn!("[p2p-server] read headers: {e}"); return; }
    };

    if is_websocket_upgrade(&headers) {
        proxy_websocket(send, recv, headers).await;
    } else {
        proxy_http(send, recv, headers).await;
    }
}

/// Regular HTTP: buffer full request, forward to localhost:7420, write response.
async fn proxy_http(
    mut send: quinn::SendStream,
    mut recv: quinn::RecvStream,
    mut buf: Vec<u8>,
) {
    // Read body (Content-Length bytes after \r\n\r\n)
    if let Some(cl) = content_length(&buf) {
        let body_start = find_body_start(&buf).unwrap_or(buf.len());
        let need = cl.saturating_sub(buf.len() - body_start);
        if need > 0 {
            let mut body = vec![0u8; need];
            if recv.read_exact(&mut body).await.is_err() { return; }
            buf.extend_from_slice(&body);
        }
    }

    let response = match forward_http(&buf).await {
        Ok(r) => r,
        Err(e) => {
            let msg = format!("HTTP/1.1 502 Bad Gateway\r\nContent-Length: {}\r\n\r\n{}", e.len(), e);
            msg.into_bytes()
        }
    };
    let _ = send.write_all(&response).await;
    let _ = send.finish();
}

/// WebSocket upgrade: bidirectional pipe between QUIC stream and local TCP.
async fn proxy_websocket(
    mut send: quinn::SendStream,
    mut recv: quinn::RecvStream,
    upgrade_req: Vec<u8>,
) {
    let mut local = match TcpStream::connect(format!("127.0.0.1:{LOCAL_HTTP_PORT}")).await {
        Ok(s) => s,
        Err(e) => {
            log::warn!("[p2p-server] WS connect local: {e}");
            return;
        }
    };
    if local.write_all(&upgrade_req).await.is_err() { return; }

    // Read 101 Switching Protocols response from local server
    let mut resp_head = Vec::new();
    let mut one = [0u8; 1];
    loop {
        if local.read_exact(&mut one).await.is_err() { return; }
        resp_head.push(one[0]);
        if resp_head.ends_with(b"\r\n\r\n") { break; }
        if resp_head.len() > 8192 { return; }
    }
    // Forward 101 response back to QUIC client
    if send.write_all(&resp_head).await.is_err() { return; }

    let (mut local_rx, mut local_tx) = local.into_split();

    // Bidirectional pipe: QUIC recv → local TCP, local TCP → QUIC send
    let t1 = tokio::spawn(async move {
        let mut buf = vec![0u8; 8192];
        loop {
            match recv.read(&mut buf).await {
                Ok(Some(n)) => { if local_tx.write_all(&buf[..n]).await.is_err() { break; } }
                _ => break,
            }
        }
    });
    let t2 = tokio::spawn(async move {
        let mut buf = vec![0u8; 8192];
        loop {
            match local_rx.read(&mut buf).await {
                Ok(0) | Err(_) => break,
                Ok(n) => { if send.write_all(&buf[..n]).await.is_err() { break; } }
            }
        }
    });
    tokio::select! { _ = t1 => {}, _ = t2 => {} }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async fn forward_http(request: &[u8]) -> Result<Vec<u8>, String> {
    let mut stream = TcpStream::connect(format!("127.0.0.1:{LOCAL_HTTP_PORT}"))
        .await
        .map_err(|e| format!("connect local: {e}"))?;
    stream.write_all(request).await.map_err(|e| e.to_string())?;
    stream.shutdown().await.map_err(|e| e.to_string())?;
    let mut resp = Vec::new();
    stream.read_to_end(&mut resp).await.map_err(|e| e.to_string())?;
    Ok(resp)
}

/// Read until `\r\n\r\n` (HTTP header block).
async fn read_http_head(recv: &mut quinn::RecvStream) -> Result<Vec<u8>, String> {
    let mut buf = Vec::new();
    let mut tmp = [0u8; 4096];
    loop {
        match recv.read(&mut tmp).await {
            Ok(Some(n)) => {
                buf.extend_from_slice(&tmp[..n]);
                if buf.windows(4).any(|w| w == b"\r\n\r\n") { return Ok(buf); }
                if buf.len() > 64 * 1024 { return Err("headers too large".into()); }
            }
            Ok(None) => return Ok(buf),
            Err(e) => return Err(e.to_string()),
        }
    }
}

/// Read a `\n`-terminated line (max `limit` bytes).
async fn read_line(recv: &mut quinn::RecvStream, limit: usize) -> Result<String, String> {
    let mut buf = Vec::new();
    let mut tmp = [0u8; 1];
    loop {
        match recv.read(&mut tmp).await {
            Ok(Some(1)) => {
                buf.push(tmp[0]);
                if tmp[0] == b'\n' { break; }
                if buf.len() >= limit { return Err("line too long".into()); }
            }
            Ok(_) => break,
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(String::from_utf8_lossy(&buf).trim().to_string())
}

fn is_websocket_upgrade(headers: &[u8]) -> bool {
    let s = String::from_utf8_lossy(headers).to_lowercase();
    s.contains("upgrade: websocket")
}

fn content_length(headers: &[u8]) -> Option<usize> {
    let text = std::str::from_utf8(headers).ok()?;
    for line in text.lines() {
        if line.to_lowercase().starts_with("content-length:") {
            return line.split(':').nth(1)?.trim().parse().ok();
        }
    }
    None
}

fn find_body_start(data: &[u8]) -> Option<usize> {
    data.windows(4).position(|w| w == b"\r\n\r\n").map(|p| p + 4)
}

// ── TLS + Supabase ───────────────────────────────────────────────────────────

fn make_server_config() -> Result<quinn::ServerConfig, String> {
    let cert = rcgen::generate_simple_self_signed(vec!["codexia-p2p".into()])
        .map_err(|e| e.to_string())?;
    let cert_der =
        rustls::pki_types::CertificateDer::from(cert.cert.der().to_vec());
    let key_der =
        rustls::pki_types::PrivateKeyDer::try_from(cert.key_pair.serialize_der())
            .map_err(|_| "invalid private key bytes".to_string())?;
    quinn::ServerConfig::with_single_cert(vec![cert_der], key_der)
        .map_err(|e| e.to_string())
}

/// Call Supabase `/auth/v1/user` to validate the JWT and return the user's `id`.
pub async fn verify_jwt(jwt: &str, supabase_url: &str, anon_key: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let res = client
        .get(format!("{supabase_url}/auth/v1/user"))
        .header("apikey", anon_key)
        .bearer_auth(jwt)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Supabase auth: {}", res.status()));
    }
    let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    body.get("id")
        .and_then(|v| v.as_str())
        .map(String::from)
        .ok_or_else(|| "no id in Supabase user response".into())
}

/// Upsert the desktop's public endpoint into `peer_endpoints` table.
/// Row key = `user_id` from JWT (via RLS, Supabase will fill it in).
async fn register_endpoint(
    jwt: &str,
    supabase_url: &str,
    anon_key: &str,
    user_id: &str,
    endpoint: SocketAddr,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{supabase_url}/rest/v1/peer_endpoints"))
        .header("apikey", anon_key)
        .header("Prefer", "resolution=merge-duplicates,return=minimal")
        .bearer_auth(jwt)
        .json(&serde_json::json!({
            "user_id":     user_id,
            "public_ip":   endpoint.ip().to_string(),
            "public_port": endpoint.port(),
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(format!("register failed {status}: {body}"));
    }
    Ok(())
}
