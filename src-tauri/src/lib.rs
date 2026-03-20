// Desktop-only modules — not compiled for iOS/Android
#[cfg(not(mobile))]
mod cc;
#[cfg(not(mobile))]
mod codex;
#[cfg(not(mobile))]
mod db;
#[cfg(not(mobile))]
mod features;
#[cfg(all(not(mobile), feature = "tauri"))]
mod state;
#[cfg(all(not(mobile), feature = "tauri"))]
mod commands;
#[cfg(all(not(mobile), feature = "tauri"))]
mod tray;
#[cfg(all(not(mobile), feature = "tauri"))]
pub mod tunnel;
#[cfg(all(not(mobile), feature = "web"))]
mod web_server;
#[cfg(all(not(mobile), feature = "web"))]
pub mod web;
#[cfg(all(not(mobile), feature = "tauri", any(windows, target_os = "linux")))]
mod window;

// Shared entry point (mobile uses only app + gui)
#[cfg(feature = "tauri")]
pub mod app;
#[cfg(feature = "tauri")]
pub mod gui;
