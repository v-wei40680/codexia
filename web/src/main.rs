const DEFAULT_WEB_PORT: u16 = 7420;

fn parse_web_options() -> (String, u16) {
    let host = "127.0.0.1".to_string();
    let mut port: u16 = std::env::var("VITE_WEB_PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_WEB_PORT);

    let mut args = std::env::args().skip(1).peekable();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--port" | "--web-port" => {
                if let Some(v) = args.next() {
                    if let Ok(p) = v.parse::<u16>() {
                        port = p;
                    }
                }
            }
            _ if arg.starts_with("--web-port=") => {
                if let Some(v) = arg.split('=').nth(1) {
                    if let Ok(p) = v.parse::<u16>() {
                        port = p;
                    }
                }
            }
            _ => {}
        }
    }

    (host, port)
}

fn main() {
    let (host, port) = parse_web_options();
    codexia_web::start_server(&host, port);
}
