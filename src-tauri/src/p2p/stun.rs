// Each function is only called from one feature combination (desktop/mobile), so suppress
// dead_code warnings that appear when compiling the other configuration.
#![allow(dead_code)]
/// Minimal STUN client (RFC 5389) — discover the public UDP endpoint for a given local port.
use std::net::{SocketAddr, ToSocketAddrs, UdpSocket};
use std::sync::{OnceLock, RwLock};
use std::time::Duration;

const MAGIC_COOKIE: u32 = 0x2112_A442;
// Default fallback servers — each gets STUN_TIMEOUT_SECS before the next is tried.
const DEFAULT_STUN_SERVERS: &[&str] = &[
    "stun.cloudflare.com:3478",
    "stun.l.google.com:19302",
];

// User-configured custom servers, prepended before the defaults at runtime.
static CUSTOM_STUN_SERVERS: OnceLock<RwLock<Vec<String>>> = OnceLock::new();

fn custom_servers_lock() -> &'static RwLock<Vec<String>> {
    CUSTOM_STUN_SERVERS.get_or_init(|| RwLock::new(Vec::new()))
}

/// Replace the custom STUN server list.  Custom servers are tried first; the
/// built-in defaults are always tried as fallbacks afterward.
pub fn set_custom_servers(servers: Vec<String>) {
    *custom_servers_lock().write().unwrap() = servers;
}

/// Build the effective server list: custom servers first, then the defaults.
fn effective_servers() -> Vec<String> {
    let custom = custom_servers_lock().read().unwrap().clone();
    let mut list = custom;
    list.extend(DEFAULT_STUN_SERVERS.iter().map(|s| s.to_string()));
    list
}
/// Per-server read timeout.  2 s is enough for any reachable STUN server;
/// keeping it short means we fall through to the next server quickly.
const STUN_TIMEOUT_SECS: u64 = 2;

/// Bind a temporary UDP socket to `0.0.0.0:<local_port>`, query a STUN server, return the
/// public (IP, port) that the NAT assigned.  The socket is dropped when this returns.
pub fn discover(local_port: u16) -> Result<SocketAddr, String> {
    let socket =
        UdpSocket::bind(format!("0.0.0.0:{local_port}")).map_err(|e| format!("STUN bind: {e}"))?;
    socket
        .set_read_timeout(Some(Duration::from_secs(STUN_TIMEOUT_SECS)))
        .map_err(|e| e.to_string())?;

    for srv in effective_servers() {
        let Ok(mut addrs) = srv.to_socket_addrs() else { continue };
        let Some(addr) = addrs.next() else { continue };
        match binding_request(&socket, addr) {
            Ok(public) => return Ok(public),
            Err(e) => log::warn!("[stun] {srv}: {e}"),
        }
    }
    Err("STUN discovery failed on all servers".into())
}

/// Run STUN on an **existing** socket and return the public endpoint.
/// Use this when you need to re-check the public address of a socket you already hold.
pub fn discover_on_socket(socket: &UdpSocket) -> Result<SocketAddr, String> {
    let prev_timeout = socket.read_timeout().ok().flatten();
    let _ = socket.set_read_timeout(Some(Duration::from_secs(STUN_TIMEOUT_SECS)));

    let result = (|| {
        for srv in effective_servers() {
            let Ok(mut addrs) = srv.to_socket_addrs() else { continue };
            let Some(addr) = addrs.next() else { continue };
            match binding_request(socket, addr) {
                Ok(public) => return Ok(public),
                Err(e) => log::warn!("[stun] {srv}: {e}"),
            }
        }
        Err("STUN discovery socket failed on all servers".into())
    })();

    let _ = socket.set_read_timeout(prev_timeout);
    result
}

/// Bind a new UDP socket on a random port, STUN-discover its public endpoint, and return
/// **both** the public address **and the socket** so the caller can hand it to Quinn.
/// This ensures Quinn and STUN share the exact same NAT mapping — required for hole punching.
pub fn discover_new_socket() -> Result<(SocketAddr, UdpSocket), String> {
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| format!("STUN bind: {e}"))?;
    socket
        .set_read_timeout(Some(Duration::from_secs(STUN_TIMEOUT_SECS)))
        .map_err(|e| e.to_string())?;

    for srv in effective_servers() {
        let Ok(mut addrs) = srv.to_socket_addrs() else { continue };
        let Some(addr) = addrs.next() else { continue };
        match binding_request(&socket, addr) {
            Ok(public) => {
                // Remove read timeout so Quinn can use the socket in non-blocking mode
                let _ = socket.set_read_timeout(None);
                return Ok((public, socket));
            }
            Err(e) => log::warn!("[stun] {srv}: {e}"),
        }
    }
    Err("STUN discovery new socket failed on all servers".into())
}

fn binding_request(socket: &UdpSocket, server: SocketAddr) -> Result<SocketAddr, String> {
    // 20-byte STUN Binding Request, no attributes
    let mut req = [0u8; 20];
    req[0] = 0x00;
    req[1] = 0x01; // type: Binding Request
    req[2] = 0x00;
    req[3] = 0x00; // message length = 0
    req[4..8].copy_from_slice(&MAGIC_COOKIE.to_be_bytes());
    // 12-byte transaction ID — use nanoseconds as pseudo-random source
    let ns = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    req[8..12].copy_from_slice(&ns.to_be_bytes());
    req[12..16].copy_from_slice(&(ns.wrapping_mul(0x1337_BEEF)).to_be_bytes());
    req[16..20].copy_from_slice(&(ns.wrapping_mul(0xDEAD_C0DE)).to_be_bytes());

    socket.send_to(&req, server).map_err(|e| e.to_string())?;

    let mut buf = [0u8; 512];
    let (n, _) = socket.recv_from(&mut buf).map_err(|e| e.to_string())?;
    parse_response(&buf[..n])
}

fn parse_response(buf: &[u8]) -> Result<SocketAddr, String> {
    if buf.len() < 20 {
        return Err("response too short".into());
    }
    let mut i = 20usize;
    while i + 4 <= buf.len() {
        let typ = u16::from_be_bytes([buf[i], buf[i + 1]]);
        let len = u16::from_be_bytes([buf[i + 2], buf[i + 3]]) as usize;
        i += 4;
        if i + len > buf.len() {
            break;
        }
        // XOR-MAPPED-ADDRESS (0x0020) or MAPPED-ADDRESS (0x0001), IPv4 only (family=0x01)
        if matches!(typ, 0x0020 | 0x0001) && len >= 8 && buf[i + 1] == 0x01 {
            let (port, ip) = if typ == 0x0020 {
                let p = u16::from_be_bytes([buf[i + 2], buf[i + 3]]) ^ (MAGIC_COOKIE >> 16) as u16;
                let a = u32::from_be_bytes([buf[i + 4], buf[i + 5], buf[i + 6], buf[i + 7]])
                    ^ MAGIC_COOKIE;
                (p, a)
            } else {
                let p = u16::from_be_bytes([buf[i + 2], buf[i + 3]]);
                let a = u32::from_be_bytes([buf[i + 4], buf[i + 5], buf[i + 6], buf[i + 7]]);
                (p, a)
            };
            let b = ip.to_be_bytes();
            return format!("{}.{}.{}.{}:{}", b[0], b[1], b[2], b[3], port)
                .parse()
                .map_err(|e: std::net::AddrParseError| e.to_string());
        }
        i += (len + 3) & !3; // 4-byte align
    }
    Err("no MAPPED-ADDRESS attribute in STUN response".into())
}
