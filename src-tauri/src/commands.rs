use std::sync::Mutex;

use tauri::{AppHandle, Emitter, State};

use crate::engine::PomodoroEngine;
use crate::models::{
    AppSettings, InsightsData, Phase, TimerPreset, TimerState, TodayStats,
};

pub struct AppState {
    pub engine: Mutex<PomodoroEngine>,
}

fn with_engine<T, F>(state: &State<AppState>, f: F) -> Result<T, String>
where
    F: FnOnce(&mut PomodoroEngine) -> T,
{
    let mut engine = state.engine.lock().map_err(|e| e.to_string())?;
    Ok(f(&mut engine))
}

#[tauri::command]
pub fn get_timer_state(state: State<AppState>) -> Result<TimerState, String> {
    with_engine(&state, |e| e.state())
}

#[tauri::command]
pub fn start_or_pause(state: State<AppState>, app: AppHandle) -> Result<TimerState, String> {
    with_engine(&state, |e| {
        e.start_or_pause();
        let s = e.state();
        emit_state(&app, &s);
        s
    })
}

#[tauri::command]
pub fn reset_timer(state: State<AppState>, app: AppHandle) -> Result<TimerState, String> {
    with_engine(&state, |e| {
        e.reset();
        let s = e.state();
        emit_state(&app, &s);
        s
    })
}

#[tauri::command]
pub fn start_break(state: State<AppState>, app: AppHandle) -> Result<TimerState, String> {
    with_engine(&state, |e| {
        e.start_break();
        let s = e.state();
        emit_state(&app, &s);
        s
    })
}

#[tauri::command]
pub fn skip_timer(state: State<AppState>, app: AppHandle) -> Result<TimerState, String> {
    with_engine(&state, |e| {
        if let Some(change) = e.skip() {
            handle_phase_change(&app, e, &change);
        }
        let s = e.state();
        emit_state(&app, &s);
        s
    })
}

#[tauri::command]
pub fn end_session(state: State<AppState>, app: AppHandle) -> Result<TimerState, String> {
    with_engine(&state, |e| {
        e.end_session();
        let s = e.state();
        emit_state(&app, &s);
        s
    })
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<AppSettings, String> {
    with_engine(&state, |e| e.settings().settings.clone())
}

#[tauri::command]
pub fn save_settings(
    state: State<AppState>,
    app: AppHandle,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let saved = with_engine(&state, |e| {
        e.settings_mut().settings = settings;
        e.settings_mut().save();
        e.refresh_preset();
        e.settings().settings.clone()
    })?;
    crate::apply_runtime_settings(&app, &saved);
    let _ = app.emit("settings-changed", &saved);
    Ok(saved)
}

#[tauri::command]
pub fn get_presets(state: State<AppState>) -> Result<Vec<TimerPreset>, String> {
    with_engine(&state, |e| e.settings().all_presets())
}

#[tauri::command]
pub fn select_preset(
    state: State<AppState>,
    app: AppHandle,
    name: String,
) -> Result<TimerState, String> {
    with_engine(&state, |e| {
        e.settings_mut().settings.selected_preset_name = name;
        e.settings_mut().save();
        e.refresh_preset();
        let s = e.state();
        emit_state(&app, &s);
        s
    })
}

#[tauri::command]
pub fn add_preset(
    state: State<AppState>,
    app: AppHandle,
    preset: TimerPreset,
) -> Result<Vec<TimerPreset>, String> {
    with_engine(&state, |e| {
        let mut p = preset;
        p.is_built_in = false;
        e.settings_mut().settings.custom_presets.push(p);
        e.settings_mut().save();
        let presets = e.settings().all_presets();
        let _ = app.emit("presets-changed", &presets);
        presets
    })
}

#[tauri::command]
pub fn get_today_stats(state: State<AppState>) -> Result<TodayStats, String> {
    with_engine(&state, |e| e.history().today_stats())
}

#[tauri::command]
pub fn get_hourly_today(state: State<AppState>) -> Result<Vec<crate::models::HourMinutes>, String> {
    with_engine(&state, |e| e.history().hourly_focus_today())
}

#[tauri::command]
pub fn get_insights(state: State<AppState>) -> Result<InsightsData, String> {
    with_engine(&state, |e| e.history().insights())
}

#[tauri::command]
pub fn get_recent_sessions(
    state: State<AppState>,
    limit: Option<u32>,
) -> Result<Vec<crate::models::RecentSession>, String> {
    let limit = limit.unwrap_or(20) as usize;
    with_engine(&state, |e| e.history().recent_sessions(limit))
}

#[tauri::command]
pub fn get_app_split(state: State<AppState>, days: u32) -> Result<Vec<crate::models::AppSplitEntry>, String> {
    with_engine(&state, |e| e.history().app_split(days.max(1)))
}

#[tauri::command]
pub fn clear_history(state: State<AppState>, app: AppHandle) -> Result<(), String> {
    with_engine(&state, |e| {
        e.history_mut().clear();
        let _ = app.emit("history-cleared", ());
    })
}

pub fn emit_state(app: &AppHandle, state: &TimerState) {
    let _ = app.emit("timer-state", state);
    update_tray(app, state);
}

pub fn handle_phase_change(
    app: &AppHandle,
    engine: &PomodoroEngine,
    change: &crate::engine::PhaseChange,
) {
    if change.completed_naturally {
        let settings = &engine.settings().settings;
        if settings.notifications_enabled {
            let title = match change.finished {
                Phase::Work => "Focus complete",
                Phase::ShortBreak | Phase::LongBreak => "Break over",
                Phase::Idle => return,
            };
            let body = format!("Next: {}", change.next.label());
            let _ = app.emit("phase-completed", serde_json::json!({ "title": title, "body": body }));
        }
    }
}

pub fn update_tray(app: &AppHandle, state: &TimerState) {
    if let Some(tray) = app.tray_by_id("main") {
        let tooltip = if state.phase == Phase::Idle {
            "Pomo Fomo — ready".to_string()
        } else {
            format!("{} · {}", state.phase_label, state.time_text)
        };
        let _ = tray.set_tooltip(Some(&tooltip));
        let _ = tray.set_title(Some(&state.time_text));
    }
}
