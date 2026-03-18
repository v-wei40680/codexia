use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Wry};

/// Create and setup the system tray
pub fn create_tray(app: &AppHandle<Wry>) -> tauri::Result<()> {
    // Create menu items
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let show_item = MenuItem::with_id(app, "show", "Show Main Window", true, None::<&str>)?;

    // Build menu
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    // Build tray icon
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();

                // Toggle tray window visibility
                if let Some(window) = app.get_webview_window("tray") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        // Position window before showing
                        position_tray_window(&window, None);
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                } else {
                    // Create tray window if it doesn't exist
                    if let Err(e) = create_tray_window(app) {
                        eprintln!("Failed to create tray window: {}", e);
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}

/// Position the tray window: horizontally centered, near bottom (above dock, like Claude).
/// `logical_height` is the known new height in logical pixels; passing it avoids a stale
/// `outer_size()` read when called immediately after `set_size`.
fn position_tray_window(window: &tauri::WebviewWindow, logical_height: Option<f64>) {
    #[cfg(target_os = "macos")]
    {
        if let Ok(monitor) = window.current_monitor() {
            if let Some(monitor) = monitor {
                let screen_size = monitor.size();
                let scale_factor = monitor.scale_factor();

                let (physical_width, physical_height) = match logical_height {
                    Some(lh) => ((672.0 * scale_factor) as u32, (lh * scale_factor) as u32),
                    None => {
                        let s = window.outer_size().unwrap_or(tauri::PhysicalSize {
                            width: (672.0 * scale_factor) as u32,
                            height: (180.0 * scale_factor) as u32,
                        });
                        (s.width, s.height)
                    }
                };

                // Horizontally centered
                let x = ((screen_size.width.saturating_sub(physical_width)) / 2) as i32;

                // Near bottom, above the dock (~100pt margin from bottom)
                let bottom_margin = (100.0 * scale_factor) as u32;
                let y = screen_size
                    .height
                    .saturating_sub(physical_height + bottom_margin) as i32;

                let _ = window
                    .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
            }
        }
    }
}

/// Show and focus the main window (called after sending from the tray popup).
#[tauri::command]
pub fn show_main_window(app: AppHandle<Wry>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Resize the tray window to the given logical height, then re-anchor its position.
#[tauri::command]
pub fn resize_tray_window(app: AppHandle<Wry>, height: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("tray") {
        let clamped = height.max(80.0).min(700.0);
        window
            .set_size(tauri::Size::Logical(tauri::LogicalSize {
                width: 672.0,
                height: clamped,
            }))
            .map_err(|e| e.to_string())?;
        // Pass the known new height so positioning doesn't rely on a potentially stale outer_size()
        position_tray_window(&window, Some(clamped));
    }
    Ok(())
}

/// Create the tray popup window
fn create_tray_window(app: &AppHandle<Wry>) -> tauri::Result<()> {
    let window = WebviewWindowBuilder::new(app, "tray", WebviewUrl::App("/tray".into()))
        .title("Quick Ask")
        .inner_size(672.0, 180.0)
        .decorations(false)
        .resizable(false)
        .skip_taskbar(true)
        .focused(true)
        .visible(true)
        .transparent(true)
        .always_on_top(true)
        .build()?;

    // Position window at the correct location
    position_tray_window(&window, None);

    // Hide window when it loses focus
    let app_handle = window.app_handle().clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Focused(false) = event {
            if let Some(window) = app_handle.get_webview_window("tray") {
                let _ = window.hide();
            }
        }
    });

    Ok(())
}
