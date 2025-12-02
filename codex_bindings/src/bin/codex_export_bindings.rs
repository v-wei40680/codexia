use std::env;
use std::path::PathBuf;

fn main() {
    let args: Vec<String> = env::args().collect();

    let out = if args.len() > 1 {
        Some(PathBuf::from(&args[1]))
    } else {
        None
    };

    codex_bindings::export_ts_types(out.as_ref());
    println!("Exported TypeScript bindings");
}
