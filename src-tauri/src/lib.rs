mod app_icons;
mod brand_icon;
mod app_tracking;
mod commands;
mod engine;
mod history;
mod models;
mod settings;
mod store;

use std::collections::HashSet;
use std::sync::Mutex;
use std::time::Duration;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, RunEvent,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use commands::AppState;
use engine::PomodoroEngine;
use history::HistoryService;
use settings::SettingsService;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = SettingsService::new();
    let history = HistoryService::new();
    let engine = PomodoroEngine::new(settings, history);

    let builder = {
        let builder = tauri::Builder::default();
        #[cfg(not(debug_assertions))]
        {
            builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
                show_main(app);
            }))
        }
        #[cfg(debug_assertions)]
        {
            builder
        }
    };

    builder
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(AppState {
            engine: Mutex::new(engine),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_timer_state,
            commands::start_or_pause,
            commands::start_break,
            commands::reset_timer,
            commands::skip_timer,
            commands::end_session,
            commands::get_settings,
            commands::save_settings,
            commands::get_presets,
            commands::select_preset,
            commands::add_preset,
            commands::get_today_stats,
            commands::get_hourly_today,
            commands::get_insights,
            commands::get_recent_sessions,
            commands::get_app_split,
            commands::clear_history,
        ])
        .setup(|app| {
            setup_tray(app.handle())?;
            #[cfg(debug_assertions)]
            warn_about_other_instances();
            if let Err(e) = register_shortcuts(app.handle()) {
                eprintln!(
                    "Global shortcuts unavailable: {e}. \
                     Quit any other Pomo Fomo instance (check the system tray) and restart."
                );
            }
            apply_startup_settings(app.handle())?;
            start_tick_loop(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let app = window.app_handle();
                    if let Ok(state) = app.state::<AppState>().engine.lock() {
                        if state.settings().settings.minimize_to_tray_on_close {
                            api.prevent_close();
                            let _ = window.hide();
                        }
                    }
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if matches!(event, RunEvent::Exit) {
                unregister_shortcuts(&app_handle);
            }
        });
}

fn unregister_shortcuts(app: &AppHandle) {
    let _ = app.global_shortcut().unregister_all();
}

#[cfg(debug_assertions)]
fn warn_about_other_instances() {
    #[cfg(windows)]
    {
        let current_pid = std::process::id();
        let output = std::process::Command::new("tasklist")
            .args(["/FI", "IMAGENAME eq pomofomo.exe", "/FO", "CSV", "/NH"])
            .output();
        if let Ok(output) = output {
            let text = String::from_utf8_lossy(&output.stdout);
            let others = text
                .lines()
                .filter(|line| line.contains("pomofomo.exe"))
                .filter_map(|line| line.split(',').nth(1))
                .filter_map(|pid| pid.trim_matches('"').parse::<u32>().ok())
                .filter(|pid| *pid != current_pid)
                .count();
            if others > 0 {
                eprintln!(
                    "Warning: {others} other Pomo Fomo instance(s) are running. \
                     Global shortcuts will not work until you quit them from the system tray."
                );
            }
        }
    }
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let dark_mode = app
        .state::<AppState>()
        .engine
        .lock()
        .map(|e| e.settings().settings.dark_mode)
        .unwrap_or(false);
    let tray_icon = brand_icon::icon_for_theme(dark_mode);

    let open_i = MenuItem::with_id(app, "open", "Open Pomo Fomo", true, None::<&str>)?;
    let start_i = MenuItem::with_id(app, "start_pause", "Start / Pause", true, None::<&str>)?;
    let skip_i = MenuItem::with_id(app, "skip", "Skip", true, None::<&str>)?;
    let reset_i = MenuItem::with_id(app, "reset", "Reset", true, None::<&str>)?;
    let end_i = MenuItem::with_id(app, "end", "End session", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(
        app,
        &[
            &open_i,
            &sep,
            &start_i,
            &skip_i,
            &reset_i,
            &end_i,
            &sep,
            &quit_i,
        ],
    )?;

    let _tray = TrayIconBuilder::with_id("main")
        .icon(tray_icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Pomo Fomo")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main(app),
            "start_pause" => {
                let _ = commands::start_or_pause(app.state(), app.clone());
            }
            "skip" => {
                let _ = commands::skip_timer(app.state(), app.clone());
            }
            "reset" => {
                let _ = commands::reset_timer(app.state(), app.clone());
            }
            "end" => {
                let _ = commands::end_session(app.state(), app.clone());
            }
            "quit" => {
                unregister_shortcuts(app);
                app.exit(0);
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
                toggle_tray_popup(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn toggle_tray_popup(app: &AppHandle) {
    let Some(popup) = app.get_webview_window("tray-popup") else {
        return;
    };
    if popup.is_visible().unwrap_or(false) {
        let _ = popup.hide();
        return;
    }
    position_tray_popup(app, &popup);
    let _ = popup.show();
    let _ = popup.set_focus();
}

fn position_tray_popup(app: &AppHandle, popup: &tauri::WebviewWindow) {
    if let Ok(monitor) = app.primary_monitor() {
        if let Some(monitor) = monitor {
            let size = monitor.size();
            let scale = monitor.scale_factor();
            let w = popup.outer_size().map(|s| s.width as f64).unwrap_or(300.0);
            let h = popup.outer_size().map(|s| s.height as f64).unwrap_or(480.0);
            let margin_right = 0.0;
            let margin_bottom = 4.0;
            let taskbar_reserve = 48.0;
            let x = (size.width as f64 / scale) - w - margin_right;
            let y = (size.height as f64 / scale) - h - margin_bottom - taskbar_reserve;
            let _ = popup.set_position(tauri::PhysicalPosition::new(
                (x * scale) as i32,
                (y * scale).max(0.0) as i32,
            ));
        }
    }
}

fn show_main(app: &AppHandle) {
    if let Some(popup) = app.get_webview_window("tray-popup") {
        let _ = popup.hide();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.unminimize();
        let _ = main.set_focus();
    }
}

fn register_shortcuts(app: &AppHandle) -> tauri::Result<()> {
    let state = app.state::<AppState>();
    let settings = state
        .engine
        .lock()
        .map(|e| e.settings().settings.clone())
        .unwrap_or_default();

    let gs = app.global_shortcut();
    let _ = gs.unregister_all();

    let mut seen = HashSet::new();
    let mut failed = 0usize;
    let mut attempted = 0usize;

    for (setting, action) in [
        (&settings.hotkey_start_pause, "start_pause"),
        (&settings.hotkey_skip, "skip"),
        (&settings.hotkey_reset, "reset"),
        (&settings.hotkey_show, "show"),
    ] {
        if !setting.enabled {
            continue;
        }
        attempted += 1;
        if !register_one(gs, setting, action, app, &mut seen)? {
            failed += 1;
        }
    }

    if failed > 0 && failed == attempted {
        eprintln!(
            "All global shortcuts failed to register. \
             Another Pomo Fomo instance is probably still running in the system tray."
        );
    }

    Ok(())
}

fn register_one(
    gs: &tauri_plugin_global_shortcut::GlobalShortcut<tauri::Wry>,
    setting: &models::HotkeySetting,
    action: &str,
    app: &AppHandle,
    seen: &mut HashSet<String>,
) -> tauri::Result<bool> {
    if !setting.enabled {
        return Ok(true);
    }
    let code = key_to_code(&setting.key)?;
    let mut mods = Modifiers::empty();
    if setting.ctrl {
        mods |= Modifiers::CONTROL;
    }
    if setting.alt {
        mods |= Modifiers::ALT;
    }
    if setting.shift {
        mods |= Modifiers::SHIFT;
    }
    if setting.win {
        mods |= Modifiers::SUPER;
    }

    let shortcut = Shortcut::new(Some(mods), code);
    let combo_key = format!("{mods:?}:{code:?}");
    if !seen.insert(combo_key) {
        eprintln!("Skipping duplicate shortcut binding for {action}");
        return Ok(true);
    }

    if gs.is_registered(shortcut) {
        let _ = gs.unregister(shortcut);
    }

    let action = action.to_string();
    let action_label = action.clone();
    let handle = app.clone();

    match gs.on_shortcut(shortcut, move |_app, _shortcut, event| {
        if event.state != ShortcutState::Pressed {
            return;
        }
        let app = handle.clone();
        match action.as_str() {
            "start_pause" => {
                let _ = commands::start_or_pause(app.state(), app.clone());
            }
            "skip" => {
                let _ = commands::skip_timer(app.state(), app.clone());
            }
            "reset" => {
                let _ = commands::reset_timer(app.state(), app.clone());
            }
            "show" => show_main(&app),
            _ => {}
        }
    }) {
        Ok(()) => Ok(true),
        Err(e) => {
            eprintln!("Could not register {action_label} shortcut ({shortcut:?}): {e}");
            Ok(false)
        }
    }
}

fn key_to_code(key: &str) -> tauri::Result<Code> {
    let upper = key.to_uppercase();
    match upper.as_str() {
        "A" => Ok(Code::KeyA),
        "B" => Ok(Code::KeyB),
        "C" => Ok(Code::KeyC),
        "D" => Ok(Code::KeyD),
        "E" => Ok(Code::KeyE),
        "F" => Ok(Code::KeyF),
        "G" => Ok(Code::KeyG),
        "H" => Ok(Code::KeyH),
        "I" => Ok(Code::KeyI),
        "J" => Ok(Code::KeyJ),
        "K" => Ok(Code::KeyK),
        "L" => Ok(Code::KeyL),
        "M" => Ok(Code::KeyM),
        "N" => Ok(Code::KeyN),
        "O" => Ok(Code::KeyO),
        "P" => Ok(Code::KeyP),
        "Q" => Ok(Code::KeyQ),
        "R" => Ok(Code::KeyR),
        "S" => Ok(Code::KeyS),
        "T" => Ok(Code::KeyT),
        "U" => Ok(Code::KeyU),
        "V" => Ok(Code::KeyV),
        "W" => Ok(Code::KeyW),
        "X" => Ok(Code::KeyX),
        "Y" => Ok(Code::KeyY),
        "Z" => Ok(Code::KeyZ),
        _ => Err(tauri::Error::from(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "unsupported key",
        ))),
    }
}

fn apply_runtime_settings(app: &AppHandle, settings: &crate::models::AppSettings) {
    let autostart = app.autolaunch();
    if settings.open_at_login {
        let _ = autostart.enable();
    } else {
        let _ = autostart.disable();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_always_on_top(settings.always_on_top);
    }
    brand_icon::apply_brand_icon(app, settings.dark_mode);
}

fn apply_startup_settings(app: &AppHandle) -> tauri::Result<()> {
    let state = app.state::<AppState>();
    if let Ok(engine) = state.engine.lock() {
        let settings = engine.settings().settings.clone();
        apply_runtime_settings(app, &settings);
    }
    Ok(())
}

fn start_tick_loop(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(1)).await;
            let result = {
                let state = app.state::<AppState>();
                let mut engine = match state.engine.lock() {
                    Ok(e) => e,
                    Err(_) => continue,
                };
                let change = engine.tick();
                let snapshot = engine.state();
                (change, snapshot)
            };

            commands::emit_state(&app, &result.1);
            if let Some(change) = result.0 {
                if let Ok(engine) = app.state::<AppState>().engine.lock() {
                    commands::handle_phase_change(&app, &engine, &change);
                }
            }
        }
    });
}
