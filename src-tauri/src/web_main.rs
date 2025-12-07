use clap::Parser;

#[derive(Parser)]
#[command(name = "codexia-web")]
#[command(about = "Codexia Web Server - Access Codexia from your browser")]
struct Args {
    /// Port to run the web server on
    #[arg(short, long, default_value = "8080")]
    port: u16,

    /// Host to bind to (0.0.0.0 for all interfaces)
    #[arg(short = 'H', long, default_value = "0.0.0.0")]
    host: String,
}

#[tokio::main]
async fn main() {
    env_logger::init();

    let args = Args::parse();

    println!("🚀 Starting Codexia Web Server...");
    println!(
        "🌐 Will be accessible at: http://{}:{}",
        args.host, args.port
    );

    if let Err(e) = cc::web_server::create_web_server(args.port).await {
        eprintln!("❌ Failed to start web server: {}", e);
        std::process::exit(1);
    }
}
