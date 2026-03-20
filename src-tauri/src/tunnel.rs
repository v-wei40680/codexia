use std::sync::{Arc, Mutex};
use std::process::{Child, Command, Stdio};
use std::io::{BufRead, BufReader};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelStatus {
    pub connected: bool,
    pub url: Option<String>,
}

struct TunnelProcess {
    child: Child,
    url: String,
}

static TUNNEL: Mutex<Option<TunnelProcess>> = Mutex::new(None);

/// Start a Cloudflare Quick Tunnel for the local app-server port.
/// Returns the public HTTPS URL assigned by Cloudflare.
pub fn start_tunnel(port: u16) -> Result<String, String> {
    let mut guard = TUNNEL.lock().map_err(|e| e.to_string())?;

    // Already running — return existing URL
    if let Some(ref t) = *guard {
        return Ok(t.url.clone());
    }

    let mut child = Command::new("cloudflared")
        .args(["tunnel", "--url", &format!("http://localhost:{port}"), "--no-autoupdate"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("cloudflared not found or failed to start: {e}"))?;

    // cloudflared prints the URL to stderr like:
    //   INF | Your quick Tunnel has been created! Visit it at (it may take some time to start up):
    //   INF | https://xxxx.trycloudflare.com
    let stderr = child.stderr.take().ok_or("no stderr")?;
    let url = extract_tunnel_url(BufReader::new(stderr))?;

    *guard = Some(TunnelProcess { child, url: url.clone() });
    Ok(url)
}

/// Stop the running tunnel process.
pub fn stop_tunnel() -> Result<(), String> {
    let mut guard = TUNNEL.lock().map_err(|e| e.to_string())?;
    if let Some(mut t) = guard.take() {
        t.child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Return current tunnel status without starting.
pub fn tunnel_status() -> TunnelStatus {
    let guard = TUNNEL.lock().unwrap_or_else(|e| e.into_inner());
    match &*guard {
        Some(t) => TunnelStatus { connected: true, url: Some(t.url.clone()) },
        None => TunnelStatus { connected: false, url: None },
    }
}

/// Read lines until we find the trycloudflare URL.
fn extract_tunnel_url(reader: BufReader<impl std::io::Read>) -> Result<String, String> {
    for line in reader.lines().take(100) {
        let line = line.map_err(|e| e.to_string())?;
        if let Some(url) = parse_url_from_line(&line) {
            return Ok(url);
        }
    }
    Err("tunnel URL not found in cloudflared output".into())
}

fn parse_url_from_line(line: &str) -> Option<String> {
    // Match both trycloudflare.com and custom tunnel domains
    let prefixes = ["https://", "http://"];
    for prefix in prefixes {
        if let Some(pos) = line.find(prefix) {
            let rest = &line[pos..];
            let end = rest.find(char::is_whitespace).unwrap_or(rest.len());
            let url = &rest[..end];
            if url.contains(".trycloudflare.com") || url.contains(".cfargotunnel.com") {
                return Some(url.to_string());
            }
        }
    }
    None
}

// ── Tauri commands ──────────────────────────────────────────────────────────

/// Start tunnel and register URL with milisp.dev.
/// `jwt` is the Supabase access token from the frontend.
#[tauri::command]
pub async fn tunnel_start(jwt: String, port: Option<u16>) -> Result<TunnelStatus, String> {
    let port = port.unwrap_or(7420);
    let url = Arc::new(start_tunnel(port)?);

    // Register with milisp.dev in the background — don't fail tunnel start if this fails
    let url_clone = Arc::clone(&url);
    let jwt_clone = jwt.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = register_desktop_url(&jwt_clone, &url_clone).await {
            log::warn!("failed to register desktop URL: {e}");
        }
    });

    Ok(TunnelStatus { connected: true, url: Some((*url).clone()) })
}

#[tauri::command]
pub fn tunnel_stop() -> Result<(), String> {
    stop_tunnel()
}

#[tauri::command]
pub fn tunnel_status_cmd() -> TunnelStatus {
    tunnel_status()
}

async fn register_desktop_url(jwt: &str, url: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let res = client
        .post("https://milisp.dev/api/desktop/register")
        .bearer_auth(jwt)
        .json(&serde_json::json!({ "url": url }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("register failed: {}", res.status()));
    }
    log::info!("desktop URL registered: {url}");
    Ok(())
}
