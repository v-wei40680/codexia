use std::io::Write;

pub fn log_to_file(message: &str) {
    if let Ok(mut log_file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/codexia.log") {
        let _ = writeln!(log_file, "{}", message);
    }
}