mod cc;
mod codex;
mod db;
mod features;
#[cfg(feature = "tauri")]
mod state;

#[cfg(feature = "tauri")]
mod commands;
#[cfg(feature = "tauri")]
pub mod gui;

#[cfg(feature = "web")]
mod web_server;
#[cfg(feature = "web")]
pub mod web;

#[cfg(all(feature = "tauri", any(windows, target_os = "linux")))]
mod window;
