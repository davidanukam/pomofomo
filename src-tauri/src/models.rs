use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    Idle,
    Work,
    ShortBreak,
    LongBreak,
}

impl Phase {
    pub fn label(self) -> &'static str {
        match self {
            Phase::Idle => "Ready",
            Phase::Work => "Focus",
            Phase::ShortBreak => "Short break",
            Phase::LongBreak => "Long break",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerPreset {
    pub name: String,
    pub work_minutes: u32,
    pub short_break_minutes: u32,
    pub long_break_minutes: u32,
    pub sessions_before_long_break: u32,
    #[serde(default)]
    pub is_built_in: bool,
}

impl TimerPreset {
    pub fn minutes_for(&self, phase: Phase) -> u32 {
        match phase {
            Phase::Work => self.work_minutes,
            Phase::ShortBreak => self.short_break_minutes,
            Phase::LongBreak => self.long_break_minutes,
            Phase::Idle => self.work_minutes,
        }
    }

    pub fn defaults() -> Vec<TimerPreset> {
        vec![
            TimerPreset {
                name: "Classic".into(),
                work_minutes: 25,
                short_break_minutes: 5,
                long_break_minutes: 15,
                sessions_before_long_break: 4,
                is_built_in: true,
            },
            TimerPreset {
                name: "Deep Work".into(),
                work_minutes: 50,
                short_break_minutes: 10,
                long_break_minutes: 25,
                sessions_before_long_break: 3,
                is_built_in: true,
            },
            TimerPreset {
                name: "Sprint".into(),
                work_minutes: 15,
                short_break_minutes: 3,
                long_break_minutes: 12,
                sessions_before_long_break: 4,
                is_built_in: true,
            },
        ]
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeySetting {
    #[serde(default = "default_true")]
    pub ctrl: bool,
    #[serde(default = "default_true")]
    pub alt: bool,
    #[serde(default)]
    pub shift: bool,
    #[serde(default)]
    pub win: bool,
    pub key: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

impl Default for HotkeySetting {
    fn default() -> Self {
        Self {
            ctrl: true,
            alt: true,
            shift: false,
            win: false,
            key: "P".into(),
            enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(default = "default_true")]
    pub auto_start_breaks: bool,
    #[serde(default)]
    pub auto_start_next_work: bool,
    #[serde(default = "default_preset")]
    pub selected_preset_name: String,
    #[serde(default = "default_true")]
    pub notifications_enabled: bool,
    #[serde(default = "default_true")]
    pub sound_enabled: bool,
    #[serde(default)]
    pub always_on_top: bool,
    #[serde(default = "default_true")]
    pub minimize_to_tray_on_close: bool,
    #[serde(default)]
    pub open_at_login: bool,
    #[serde(default = "default_true")]
    pub analytics_enabled: bool,
    #[serde(default)]
    pub dark_mode: bool,
    #[serde(default)]
    pub custom_presets: Vec<TimerPreset>,
    #[serde(default = "default_hotkey_p")]
    pub hotkey_start_pause: HotkeySetting,
    #[serde(default = "default_hotkey_k")]
    pub hotkey_skip: HotkeySetting,
    #[serde(default = "default_hotkey_r")]
    pub hotkey_reset: HotkeySetting,
    #[serde(default = "default_hotkey_o")]
    pub hotkey_show: HotkeySetting,
}

fn default_preset() -> String {
    "Classic".into()
}
fn default_hotkey_p() -> HotkeySetting {
    HotkeySetting {
        key: "P".into(),
        ..Default::default()
    }
}
fn default_hotkey_k() -> HotkeySetting {
    HotkeySetting {
        key: "K".into(),
        ..Default::default()
    }
}
fn default_hotkey_r() -> HotkeySetting {
    HotkeySetting {
        key: "R".into(),
        ..Default::default()
    }
}
fn default_hotkey_o() -> HotkeySetting {
    HotkeySetting {
        key: "O".into(),
        ..Default::default()
    }
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            auto_start_breaks: true,
            auto_start_next_work: false,
            selected_preset_name: default_preset(),
            notifications_enabled: true,
            sound_enabled: true,
            always_on_top: false,
            minimize_to_tray_on_close: true,
            open_at_login: false,
            analytics_enabled: true,
            dark_mode: false,
            custom_presets: vec![],
            hotkey_start_pause: default_hotkey_p(),
            hotkey_skip: default_hotkey_k(),
            hotkey_reset: default_hotkey_r(),
            hotkey_show: default_hotkey_o(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionRecord {
    pub start_local: String,
    pub end_local: String,
    pub phase: Phase,
    pub planned_seconds: u32,
    pub elapsed_seconds: u32,
    pub completed: bool,
    pub preset_name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TimerState {
    pub phase: Phase,
    pub planned_seconds: u32,
    pub elapsed_seconds: u32,
    pub remaining_seconds: u32,
    pub progress: f64,
    pub is_running: bool,
    pub time_text: String,
    pub phase_label: String,
    pub completed_work_in_cycle: u32,
    pub sessions_before_long_break: u32,
    pub preset_name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TodayStats {
    pub sessions: u32,
    pub minutes: f64,
    pub streak: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct HourMinutes {
    pub hour: u32,
    pub minutes: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct InsightsData {
    pub week_hours: f64,
    pub streak: u32,
    pub last_days: Vec<DayMinutes>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DayMinutes {
    pub day: String,
    pub minutes: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct RecentSession {
    pub start_local: String,
    pub end_local: String,
    pub preset_name: String,
    pub elapsed_seconds: u32,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppUsageRecord {
    pub day: String,
    pub app_name: String,
    pub seconds: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub exe_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AppSplitEntry {
    pub app_name: String,
    pub minutes: f64,
    pub percent: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
}
