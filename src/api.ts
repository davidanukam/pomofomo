import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  AppSplitEntry,
  HourMinutes,
  InsightsData,
  RecentSession,
  TimerPreset,
  TimerState,
  TodayStats,
} from "./types";

export const api = {
  getTimerState: () => invoke<TimerState>("get_timer_state"),
  startOrPause: () => invoke<TimerState>("start_or_pause"),
  startBreak: () => invoke<TimerState>("start_break"),
  reset: () => invoke<TimerState>("reset_timer"),
  skip: () => invoke<TimerState>("skip_timer"),
  endSession: () => invoke<TimerState>("end_session"),
  getSettings: () => invoke<AppSettings>("get_settings"),
  saveSettings: (settings: AppSettings) =>
    invoke<AppSettings>("save_settings", { settings }),
  getPresets: () => invoke<TimerPreset[]>("get_presets"),
  selectPreset: (name: string) =>
    invoke<TimerState>("select_preset", { name }),
  addPreset: (preset: TimerPreset) =>
    invoke<TimerPreset[]>("add_preset", { preset }),
  getTodayStats: () => invoke<TodayStats>("get_today_stats"),
  getHourlyToday: () => invoke<HourMinutes[]>("get_hourly_today"),
  getInsights: () => invoke<InsightsData>("get_insights"),
  getRecentSessions: (limit?: number) =>
    invoke<RecentSession[]>("get_recent_sessions", { limit }),
  getAppSplit: (days: number) => invoke<AppSplitEntry[]>("get_app_split", { days }),
  clearHistory: () => invoke<void>("clear_history"),
};
