fn main() {
    if std::env::var_os("CARGO_FEATURE_TAURI").is_some() {
        tauri_build::build()
    }
}
