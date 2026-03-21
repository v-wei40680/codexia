/// Mobile P2P client: connect to the desktop Quinn QUIC server, authenticate via JWT,
/// then start a local HTTP proxy on :7420 so the React frontend works unchanged.
use std::net::SocketAddr;
use std::sync::Arc;

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

const LOCAL_PROXY_PORT: u16 = 7420;

// ── Public handle ────────────────────────────────────────────────────────────

pub struct P2PClient {
    pub connection: quinn::Connection,
    /// Abort the local proxy when dropped
    _proxy_task: tokio::task::JoinHandle<()>,
    /// Keep the Quinn endpoint alive
    _endpoint: quinn::Endpoint,
}

// ── Entry point ──────────────────────────────────────────────────────────────

/// `desktop_endpoint` = "1.2.3.4:7422" — fetched from Supabase on the JS side.
pub async fn connect(jwt: String, desktop_endpoint: String) -> Result<P2PClient, String> {
    let _ = rustls::crypto::ring::default_provider().install_default();

    let server_addr: SocketAddr = desktop_endpoint
        .parse()
        .map_err(|e: std::net::AddrParseError| e.to_string())?;

    // Bind to any local UDP port
    let mut endpoint =
        quinn::Endpoint::client("0.0.0.0:0".parse().unwrap()).map_err(|e| e.to_string())?;
    endpoint.set_default_client_config(make_client_config());

    let conn = endpoint
        .connect(server_addr, "codexia-p2p")
        .map_err(|e| e.to_string())?
        .await
        .map_err(|e| e.to_string())?;
    log::info!("[p2p-client] connected to {server_addr}");

    // Auth: send JWT, wait for "OK"
    let (mut tx, mut rx) = conn.open_bi().await.map_err(|e| e.to_string())?;
    tx.write_all(format!("{jwt}\n").as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    let _ = tx.finish();

    let mut resp = [0u8; 32];
    let n = rx.read(&mut resp).await.map_err(|e| e.to_string())?.unwrap_or(0);
    let reply = String::from_utf8_lossy(&resp[..n]).trim().to_string();
    if reply != "OK" {
        return Err(format!("auth rejected: {reply}"));
    }
    log::info!("[p2p-client] auth OK — starting local proxy on :{LOCAL_PROXY_PORT}");

    let conn_clone = conn.clone();
    let proxy_task = tokio::spawn(async move {
        if let Err(e) = local_proxy(conn_clone).await {
            log::error!("[p2p-client] proxy error: {e}");
        }
    });

    Ok(P2PClient { connection: conn, _proxy_task: proxy_task, _endpoint: endpoint })
}

// ── Local HTTP proxy ─────────────────────────────────────────────────────────

async fn local_proxy(conn: quinn::Connection) -> Result<(), String> {
    let listener = TcpListener::bind(format!("127.0.0.1:{LOCAL_PROXY_PORT}"))
        .await
        .map_err(|e| format!("bind proxy :{LOCAL_PROXY_PORT}: {e}"))?;
    log::info!("[p2p-client] proxy listening on 127.0.0.1:{LOCAL_PROXY_PORT}");

    loop {
        match listener.accept().await {
            Ok((tcp, _peer)) => {
                let c = conn.clone();
                tokio::spawn(handle_tcp(tcp, c));
            }
            Err(e) => {
                log::warn!("[p2p-client] accept: {e}");
                break;
            }
        }
    }
    Ok(())
}

async fn handle_tcp(mut tcp: TcpStream, conn: quinn::Connection) {
    // Read HTTP headers from local caller
    let mut req = Vec::new();
    let mut tmp = [0u8; 4096];
    loop {
        match tcp.read(&mut tmp).await {
            Ok(0) => break,
            Ok(n) => {
                req.extend_from_slice(&tmp[..n]);
                if req.windows(4).any(|w| w == b"\r\n\r\n") {
                    // Try to read body if Content-Length present
                    if let Some(cl) = content_length(&req) {
                        let body_start = find_body_start(&req).unwrap_or(req.len());
                        let have = req.len() - body_start;
                        let need = cl.saturating_sub(have);
                        if need > 0 {
                            req.resize(req.len() + need, 0);
                            let tail = req.len() - need;
                            if tcp.read_exact(&mut req[tail..]).await.is_err() { return; }
                        }
                    }
                    break;
                }
                if req.len() > 4 * 1024 * 1024 { return; }
            }
            Err(e) => { log::warn!("[p2p-client] TCP read: {e}"); return; }
        }
    }
    if req.is_empty() { return; }

    // Open QUIC bidi-stream to desktop
    let (mut qs, mut qr) = match conn.open_bi().await {
        Ok(s) => s,
        Err(e) => { log::warn!("[p2p-client] open_bi: {e}"); return; }
    };

    if is_websocket_upgrade(&req) {
        // WebSocket: bidirectional pipe over the QUIC stream
        if qs.write_all(&req).await.is_err() { return; }

        // Read 101 response from server
        let mut head = Vec::new();
        let mut one = [0u8; 1];
        loop {
            match qr.read(&mut one).await {
                Ok(Some(1)) => {
                    head.push(one[0]);
                    if head.ends_with(b"\r\n\r\n") { break; }
                    if head.len() > 8192 { return; }
                }
                _ => return,
            }
        }
        if tcp.write_all(&head).await.is_err() { return; }

        let (mut tcp_rx, mut tcp_tx) = tcp.into_split();
        let t1 = tokio::spawn(async move {
            let mut b = vec![0u8; 8192];
            loop {
                match tcp_rx.read(&mut b).await {
                    Ok(0) | Err(_) => break,
                    Ok(n) => { if qs.write_all(&b[..n]).await.is_err() { break; } }
                }
            }
        });
        let t2 = tokio::spawn(async move {
            let mut b = vec![0u8; 8192];
            loop {
                match qr.read(&mut b).await {
                    Ok(Some(n)) => { if tcp_tx.write_all(&b[..n]).await.is_err() { break; } }
                    _ => break,
                }
            }
        });
        tokio::select! { _ = t1 => {}, _ = t2 => {} }
    } else {
        // Regular HTTP: send request, receive response
        if qs.write_all(&req).await.is_err() { return; }
        let _ = qs.finish();

        let mut resp = Vec::new();
        loop {
            match qr.read(&mut tmp).await {
                Ok(Some(n)) => resp.extend_from_slice(&tmp[..n]),
                Ok(None) => break,
                Err(e) => { log::warn!("[p2p-client] QUIC recv: {e}"); return; }
            }
        }
        let _ = tcp.write_all(&resp).await;
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn is_websocket_upgrade(h: &[u8]) -> bool {
    String::from_utf8_lossy(h).to_lowercase().contains("upgrade: websocket")
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

// ── TLS: skip server cert verification (auth is JWT-based) ───────────────────

fn make_client_config() -> quinn::ClientConfig {
    let crypto = rustls::ClientConfig::builder()
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(SkipVerification))
        .with_no_client_auth();
    quinn::ClientConfig::new(Arc::new(
        quinn::crypto::rustls::QuicClientConfig::try_from(crypto).unwrap(),
    ))
}

#[derive(Debug)]
struct SkipVerification;

impl rustls::client::danger::ServerCertVerifier for SkipVerification {
    fn verify_server_cert(
        &self,
        _: &rustls::pki_types::CertificateDer<'_>,
        _: &[rustls::pki_types::CertificateDer<'_>],
        _: &rustls::pki_types::ServerName<'_>,
        _: &[u8],
        _: rustls::pki_types::UnixTime,
    ) -> Result<rustls::client::danger::ServerCertVerified, rustls::Error> {
        Ok(rustls::client::danger::ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        _: &[u8],
        _: &rustls::pki_types::CertificateDer<'_>,
        _: &rustls::DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn verify_tls13_signature(
        &self,
        _: &[u8],
        _: &rustls::pki_types::CertificateDer<'_>,
        _: &rustls::DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn supported_verify_schemes(&self) -> Vec<rustls::SignatureScheme> {
        rustls::crypto::ring::default_provider()
            .signature_verification_algorithms
            .supported_schemes()
    }
}
