// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(feature = "web")]
const DEFAULT_WEB_PORT: u16 = 7420;

#[cfg(all(feature = "tauri", feature = "web"))]
fn parse_web_options() -> (bool, String, Option<u16>) {
    let mut web = false;
    let mut host = "127.0.0.1".to_string();
    let mut port: Option<u16> = std::env::var("VITE_WEB_PORT")
        .ok()
        .and_then(|value| value.parse().ok());

    let mut args = std::env::args().skip(1).peekable();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "web" | "--web" => web = true,
            "--host" => host = "0.0.0.0".to_string(),
            "--port" | "--web-port" => {
                if let Some(value) = args.next() {
                    if let Ok(parsed) = value.parse::<u16>() {
                        port = Some(parsed);
                    }
                }
            }
            _ if arg.starts_with("--web-port=") => {
                if let Some(value) = arg.split('=').nth(1) {
                    if let Ok(parsed) = value.parse::<u16>() {
                        port = Some(parsed);
                    }
                }
            }
            _ => {}
        }
    }

    (web, host, port)
}

#[cfg(feature = "tauri")]
fn init_tauri_env() {
    let _ = fix_path_env::fix();
}

fn main() {
    #[cfg(all(feature = "tauri", feature = "web"))]
    {
        init_tauri_env();
        let (web, host, port) = parse_web_options();
        if web {
            codexia_lib::web::start_server(&host, port.unwrap_or(DEFAULT_WEB_PORT));
            return;
        }
        codexia_lib::run();
        return;
    }

    #[cfg(all(feature = "tauri", not(feature = "web")))]
    {
        init_tauri_env();
        codexia_lib::run();
        return;
    }

    #[cfg(all(feature = "web", not(feature = "tauri")))]
    {
        codexia_lib::web::start_server(
            "127.0.0.1",
            std::env::var("VITE_WEB_PORT")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(DEFAULT_WEB_PORT),
        );
        return;
    }

    #[cfg(not(any(feature = "tauri", feature = "web")))]
    {
        panic!("Enable at least one feature: `tauri` or `web`");
    }
}
