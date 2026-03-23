/// Desktop P2P server: Quinn QUIC server that dispatches HTTP requests in-process
/// via the axum Router stored in `router_handle`, and proxies WebSocket to a
/// loopback-only TCP listener.  Only same-Supabase-account clients are allowed.
use std::net::SocketAddr;

use axum::http;
use serde_json::json;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::broadcast;

/// UDP port the Quinn endpoint listens on.  Must match STUN discovery port.
pub const P2P_UDP_PORT: u16 = 7422;

// ── Public handle ────────────────────────────────────────────────────────────

pub struct P2PServer {
    pub endpoint: quinn::Endpoint,
    pub public_endpoint: SocketAddr,
    // Option so p2p_stop can take the handles and await them without hitting the
    // "cannot move out of a type that implements Drop" restriction.
    accept_task: Option<tokio::task::JoinHandle<()>>,
    punch_task: Option<tokio::task::JoinHandle<()>>,
}

impl Drop for P2PServer {
    fn drop(&mut self) {
        // Safety net for any unexpected drop path — tasks are already taken by
        // stop(), so these are usually no-ops.
        if let Some(t) = self.accept_task.take() { t.abort(); }
        if let Some(t) = self.punch_task.take() { t.abort(); }
    }
}

impl P2PServer {
    /// Close the server and wait until both background tasks have exited so the
    /// UDP socket on port 7422 is fully released before this returns.
    pub async fn stop(mut self) {
        self.endpoint.close(0u32.into(), b"stopped");
        let at = self.accept_task.take();
        let pt = self.punch_task.take();
        drop(self); // drops the P2PServer's own Endpoint clone
        if let Some(t) = at { t.abort(); let _ = t.await; }
        if let Some(t) = pt { t.abort(); let _ = t.await; }
    }
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

    // 5. Accept-loop + punch-loop in background
    let ep = endpoint.clone();
    let accept_task = tokio::spawn(accept_loop(ep.clone(), owner_user_id.clone(), supabase_url.clone(), anon_key.clone()));
    let punch_task = tokio::spawn(punch_loop(ep, host_jwt, supabase_url, anon_key, owner_user_id));

    Ok(P2PServer { endpoint, public_endpoint, accept_task: Some(accept_task), punch_task: Some(punch_task) })
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

    // Clear the phone endpoint from Supabase in the background so the punch_loop
    // stops firing.  Must NOT be awaited here — the phone starts sending requests
    // immediately after auth and we cannot block the proxy loop.
    {
        let (jwt2, url2, key2, uid2) = (jwt.clone(), supabase_url.clone(), anon_key.clone(), client_uid.clone());
        tokio::spawn(async move {
            let _ = clear_phone_endpoint(&jwt2, &url2, &key2, &uid2).await;
        });
    }

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
    } else if is_sse_request(&headers) {
        proxy_sse(send).await;
    } else {
        proxy_http(send, recv, headers).await;
    }
}

/// Regular HTTP: buffer full request, dispatch in-process via the axum Router.
/// No TCP port is opened — the router is called directly as a Tower service.
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

    let response = match dispatch_in_process(&buf).await {
        Ok(r) => r,
        Err(e) => {
            let msg = format!("HTTP/1.1 502 Bad Gateway\r\nContent-Length: {}\r\n\r\n{}", e.len(), e);
            msg.into_bytes()
        }
    };
    let _ = send.write_all(&response).await;
    let _ = send.finish();
}

/// Dispatch a raw HTTP/1.1 request directly through the in-process axum Router.
async fn dispatch_in_process(raw: &[u8]) -> Result<Vec<u8>, String> {
    use tower::Service;

    // Parse request line + headers
    let mut header_buf = [httparse::EMPTY_HEADER; 64];
    let mut parsed = httparse::Request::new(&mut header_buf);
    let body_offset = match parsed.parse(raw) {
        Ok(httparse::Status::Complete(n)) => n,
        _ => return Err("failed to parse HTTP request".into()),
    };

    let method = http::Method::from_bytes(parsed.method.unwrap_or("GET").as_bytes())
        .map_err(|e| e.to_string())?;
    let uri: http::Uri = parsed.path.unwrap_or("/").parse().map_err(|e: http::uri::InvalidUri| e.to_string())?;

    let mut builder = http::Request::builder().method(method).uri(uri);
    for h in parsed.headers.iter() {
        builder = builder.header(h.name, h.value);
    }
    let body = axum::body::Body::from(raw[body_offset..].to_vec());
    let request = builder.body(body).map_err(|e| e.to_string())?;

    // Call the router in-process
    let mut router = super::router_handle::get()
        .ok_or_else(|| "P2P router not initialized".to_string())?;
    let response = router.call(request).await.map_err(|e| e.to_string())?;

    // Serialize response to HTTP/1.1 wire format
    let status = response.status();
    let headers = response.headers().clone();
    let mut out = format!(
        "HTTP/1.1 {} {}\r\n",
        status.as_u16(),
        status.canonical_reason().unwrap_or("")
    )
    .into_bytes();
    for (name, value) in &headers {
        out.extend_from_slice(name.as_str().as_bytes());
        out.extend_from_slice(b": ");
        out.extend_from_slice(value.as_bytes());
        out.extend_from_slice(b"\r\n");
    }
    out.extend_from_slice(b"\r\n");
    let body_bytes = axum::body::to_bytes(response.into_body(), 64 * 1024 * 1024)
        .await
        .map_err(|e| e.to_string())?;
    out.extend_from_slice(&body_bytes);
    Ok(out)
}

/// SSE (Server-Sent Events): subscribe to the p2p_bridge broadcast channel and stream
/// JSON events directly over the QUIC stream — no TCP hop to a web server needed.
async fn proxy_sse(mut send: quinn::SendStream) {
    let Some(tx) = crate::features::p2p_bridge::get_sender() else {
        log::warn!("[p2p-server] SSE: event bridge not ready");
        let _ = send.write_all(b"HTTP/1.1 503 Service Unavailable\r\nContent-Length: 0\r\n\r\n").await;
        return;
    };
    let mut rx = tx.subscribe();

    let headers = b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-cache\r\nAccess-Control-Allow-Origin: *\r\n\r\n";
    if send.write_all(headers).await.is_err() {
        return;
    }

    loop {
        match rx.recv().await {
            Ok((event, payload)) => {
                let line = format!("data: {}\n\n", json!({"event": event, "payload": payload}));
                if send.write_all(line.as_bytes()).await.is_err() {
                    break;
                }
            }
            Err(broadcast::error::RecvError::Closed) => break,
            Err(broadcast::error::RecvError::Lagged(_)) => continue,
        }
    }
}

/// WebSocket upgrade: bidirectional pipe between QUIC stream and the loopback WS listener.
/// WebSocket upgrades require a real TCP connection (hyper limitation), so a dedicated
/// loopback listener is started on an OS-assigned port during `p2p_start`.
async fn proxy_websocket(
    mut send: quinn::SendStream,
    mut recv: quinn::RecvStream,
    upgrade_req: Vec<u8>,
) {
    let ws_port = match super::router_handle::ws_port() {
        Some(p) => p,
        None => { log::warn!("[p2p-server] WS port not initialized"); return; }
    };
    let mut local = match TcpStream::connect(format!("127.0.0.1:{ws_port}")).await {
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

fn is_sse_request(headers: &[u8]) -> bool {
    let s = String::from_utf8_lossy(headers).to_lowercase();
    s.contains("text/event-stream")
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

// ── NAT hole-punching ────────────────────────────────────────────────────────

/// Poll Supabase every second for a phone endpoint registered against this user.
/// When found, send UDP packets from our Quinn socket to the phone's public addr,
/// opening the home-router's NAT so the phone's QUIC Initial packets get through.
async fn punch_loop(
    endpoint: quinn::Endpoint,
    jwt: String,
    supabase_url: String,
    anon_key: String,
    user_id: String,
) {
    use std::net::SocketAddr;
    use std::time::Duration;

    let client = reqwest::Client::new();
    // Track the last-punched address with a timestamp. Re-punch the same address after
    // REPUNCH_SECS so a phone that reconnects with the same NAT mapping is not stuck
    // waiting 30 s for the QUIC timeout.
    const REPUNCH_SECS: u64 = 10;
    let mut last_punched: Option<(SocketAddr, std::time::Instant)> = None;

    loop {
        tokio::time::sleep(Duration::from_secs(1)).await;

        // Query peer_endpoints for a phone endpoint (set by mobile before connecting)
        let url = format!(
            "{}/rest/v1/peer_endpoints?user_id=eq.{}&select=phone_ip,phone_port&phone_ip=not.is.null",
            supabase_url, user_id
        );
        let Ok(res) = client
            .get(&url)
            .header("apikey", &anon_key)
            .bearer_auth(&jwt)
            .send()
            .await
        else {
            continue;
        };
        let Ok(rows) = res.json::<Vec<serde_json::Value>>().await else { continue };
        let Some(row) = rows.first() else { continue };

        let phone_ip = row.get("phone_ip").and_then(|v| v.as_str()).unwrap_or("");
        let phone_port = row.get("phone_port").and_then(|v| v.as_u64()).unwrap_or(0) as u16;
        if phone_ip.is_empty() || phone_port == 0 {
            continue;
        }

        let Ok(phone_addr) = format!("{phone_ip}:{phone_port}").parse::<SocketAddr>() else {
            continue;
        };
        // Skip if we punched the same address recently enough that the NAT mapping
        // is still open. Re-punch after REPUNCH_SECS to handle reconnections.
        if let Some((addr, when)) = &last_punched {
            if *addr == phone_addr && when.elapsed().as_secs() < REPUNCH_SECS {
                continue;
            }
        }

        log::info!("[p2p-server] punching NAT toward phone: {phone_addr}");
        last_punched = Some((phone_addr, std::time::Instant::now()));

        // Fire a few outgoing QUIC packets to open the home router's NAT.
        // We don't await or care about the result — just need UDP out on port 7422.
        let ep = endpoint.clone();
        tokio::spawn(async move {
            for _ in 0..5u8 {
                if let Ok(connecting) = ep.connect(phone_addr, "codexia-p2p") {
                    // Drop immediately — we only care about the outgoing UDP packets
                    tokio::spawn(async move { drop(connecting.await) });
                }
                tokio::time::sleep(Duration::from_millis(150)).await;
            }
        });
    }
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

/// Detect the desktop's LAN IP. Uses `local-ip-address` which enumerates
/// real network interfaces, avoiding macOS virtual/VPN interfaces (e.g. utun/198.18.x.x).
fn local_ip() -> Option<std::net::IpAddr> {
    let ip = local_ip_address::local_ip().ok()?;
    if is_private_ip(ip) { Some(ip) } else { None }
}

fn is_private_ip(ip: std::net::IpAddr) -> bool {
    match ip {
        std::net::IpAddr::V4(v4) => {
            let o = v4.octets();
            matches!(o, [10, ..] | [172, 16..=31, ..] | [192, 168, ..])
        }
        std::net::IpAddr::V6(_) => false,
    }
}

/// Upsert the desktop's public + local endpoint into `peer_endpoints`.
async fn register_endpoint(
    jwt: &str,
    supabase_url: &str,
    anon_key: &str,
    user_id: &str,
    endpoint: SocketAddr,
) -> Result<(), String> {
    let lan_ip = local_ip().map(|ip| ip.to_string());
    log::info!("[p2p-server] local IP: {:?}", lan_ip);

    let client = reqwest::Client::new();
    let res = client
        .post(format!("{supabase_url}/rest/v1/peer_endpoints"))
        .header("apikey", anon_key)
        .header("Prefer", "resolution=merge-duplicates,return=minimal")
        .bearer_auth(jwt)
        // Also clear any stale phone_ip/phone_port from the previous session so the
        // punch_loop does not punch a dead address and then skip the mobile's real
        // endpoint (same NAT mapping) due to the last_punched deduplication check.
        .json(&serde_json::json!({
            "user_id":     user_id,
            "public_ip":   endpoint.ip().to_string(),
            "public_port": endpoint.port(),
            "local_ip":    lan_ip,
            "local_port":  P2P_UDP_PORT,
            "phone_ip":    serde_json::Value::Null,
            "phone_port":  serde_json::Value::Null,
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

/// Null out phone_ip / phone_port in Supabase once a phone has authenticated.
/// This stops the punch_loop from re-punching an already-connected phone.
async fn clear_phone_endpoint(
    jwt: &str,
    supabase_url: &str,
    anon_key: &str,
    user_id: &str,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let res = client
        .patch(format!("{supabase_url}/rest/v1/peer_endpoints?user_id=eq.{user_id}"))
        .header("apikey", anon_key)
        .header("Prefer", "return=minimal")
        .bearer_auth(jwt)
        .json(&serde_json::json!({
            "phone_ip":   serde_json::Value::Null,
            "phone_port": serde_json::Value::Null,
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("clear phone endpoint: {}", res.status()));
    }
    Ok(())
}
