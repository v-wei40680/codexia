// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let _ = fix_path_env::fix();
    let mut web = false;
    let mut port: Option<u16> = std::env::var("WEB_PORT")
        .ok()
        .and_then(|value| value.parse().ok());

    let mut args = std::env::args().skip(1).peekable();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "web" | "--web" => web = true,
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

    if web {
        codexia_lib::start_web_server(port.unwrap_or(7420));
        return;
    }
    codexia_lib::run()
}
