export type Phase = "idle" | "work" | "short_break" | "long_break";

export interface TimerState {
  phase: Phase;
  planned_seconds: number;
  elapsed_seconds: number;
  remaining_seconds: number;
  progress: number;
  is_running: boolean;
  time_text: string;
  phase_label: string;
  completed_work_in_cycle: number;
  sessions_before_long_break: number;
  preset_name: string;
}

export interface TimerPreset {
  name: string;
  work_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  sessions_before_long_break: number;
  is_built_in?: boolean;
}

export interface HotkeySetting {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  win: boolean;
  key: string;
  enabled: boolean;
}

export interface AppSettings {
  auto_start_breaks: boolean;
  auto_start_next_work: boolean;
  selected_preset_name: string;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  always_on_top: boolean;
  minimize_to_tray_on_close: boolean;
  open_at_login: boolean;
  analytics_enabled: boolean;
  dark_mode: boolean;
  custom_presets: TimerPreset[];
  hotkey_start_pause: HotkeySetting;
  hotkey_skip: HotkeySetting;
  hotkey_reset: HotkeySetting;
  hotkey_show: HotkeySetting;
}

export interface TodayStats {
  sessions: number;
  minutes: number;
  streak: number;
}

export interface DayMinutes {
  day: string;
  minutes: number;
}

export interface HourMinutes {
  hour: number;
  minutes: number;
}

export interface InsightsData {
  week_hours: number;
  streak: number;
  last_days: DayMinutes[];
}

export interface RecentSession {
  start_local: string;
  end_local: string;
  preset_name: string;
  elapsed_seconds: number;
  completed: boolean;
}

export interface AppSplitEntry {
  app_name: string;
  minutes: number;
  percent: number;
  icon?: string;
}

export type View = "timer" | "stats" | "settings";
export type StatsRange = "today" | "7d" | "30d";
