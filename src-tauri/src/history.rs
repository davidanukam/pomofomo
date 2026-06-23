use chrono::{Datelike, Local, NaiveDate};

use crate::models::{
    AppSplitEntry, AppUsageRecord, DayMinutes, HourMinutes, InsightsData, Phase, SessionRecord,
    TodayStats,
};
use crate::store;

const FILE_NAME: &str = "history.json";
const APP_USAGE_FILE: &str = "app_usage.json";

pub struct HistoryService {
    records: Vec<SessionRecord>,
    app_usage: Vec<AppUsageRecord>,
    app_usage_dirty: bool,
    app_usage_ticks: u32,
}

impl HistoryService {
    pub fn new() -> Self {
        Self {
            records: store::load(FILE_NAME, Vec::new),
            app_usage: store::load(APP_USAGE_FILE, Vec::new),
            app_usage_dirty: false,
            app_usage_ticks: 0,
        }
    }

    pub fn add(&mut self, record: SessionRecord) {
        self.records.push(record);
        store::save(FILE_NAME, &self.records);
    }

    pub fn clear(&mut self) {
        self.records.clear();
        self.app_usage.clear();
        self.app_usage_dirty = false;
        self.app_usage_ticks = 0;
        store::save(FILE_NAME, &self.records);
        store::save(APP_USAGE_FILE, &self.app_usage);
    }

    pub fn flush_app_usage(&mut self) {
        if self.app_usage_dirty {
            store::save(APP_USAGE_FILE, &self.app_usage);
            self.app_usage_dirty = false;
            self.app_usage_ticks = 0;
        }
    }

    pub fn record_app_second(&mut self, app_name: &str, exe_path: Option<&str>) {
        let day = Local::now().format("%Y-%m-%d").to_string();
        if let Some(entry) = self
            .app_usage
            .iter_mut()
            .find(|e| e.day == day && e.app_name == app_name)
        {
            entry.seconds += 1;
            if entry.exe_path.is_none() {
                entry.exe_path = exe_path.map(str::to_string);
            }
        } else {
            self.app_usage.push(AppUsageRecord {
                day: day.clone(),
                app_name: app_name.to_string(),
                seconds: 1,
                exe_path: exe_path.map(str::to_string),
            });
        }
        self.app_usage_dirty = true;
        self.app_usage_ticks += 1;
        if self.app_usage_ticks >= 10 {
            self.flush_app_usage();
        }
    }

    pub fn app_split(&self, days: u32) -> Vec<AppSplitEntry> {
        let today = Local::now().date_naive();
        let start = today - chrono::Duration::days(days.saturating_sub(1) as i64);
        let mut totals: std::collections::HashMap<String, (u32, Option<String>)> =
            std::collections::HashMap::new();

        for entry in &self.app_usage {
            let Some(day) = Self::parse_day(&entry.day) else {
                continue;
            };
            if day < start || day > today {
                continue;
            }
            let agg = totals.entry(entry.app_name.clone()).or_insert((0, None));
            agg.0 += entry.seconds;
            if agg.1.is_none() {
                agg.1 = entry.exe_path.clone();
            }
        }

        let total_seconds: u32 = totals.values().map(|(seconds, _)| *seconds).sum();
        if total_seconds == 0 {
            return Vec::new();
        }

        let mut entries: Vec<AppSplitEntry> = totals
            .into_iter()
            .map(|(app_name, (seconds, exe_path))| {
                let minutes = seconds as f64 / 60.0;
                let percent = (seconds as f64 / total_seconds as f64) * 100.0;
                let icon = exe_path
                    .as_deref()
                    .and_then(crate::app_icons::icon_data_url_for_exe);
                AppSplitEntry {
                    app_name,
                    minutes,
                    percent,
                    icon,
                }
            })
            .collect();

        entries.sort_by(|a, b| {
            b.minutes
                .partial_cmp(&a.minutes)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        entries.truncate(12);
        entries
    }

    fn is_completed_focus(r: &SessionRecord) -> bool {
        r.phase == Phase::Work && r.completed
    }

    fn parse_day(s: &str) -> Option<NaiveDate> {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
    }

    fn record_day(r: &SessionRecord) -> Option<NaiveDate> {
        let date_part = r.start_local.split('T').next()?;
        Self::parse_day(date_part)
    }

    pub fn focus_sessions_on(&self, day: NaiveDate) -> u32 {
        self.records
            .iter()
            .filter(|r| Self::is_completed_focus(r))
            .filter(|r| Self::record_day(r) == Some(day))
            .count() as u32
    }

    pub fn focus_sessions_today(&self) -> u32 {
        self.focus_sessions_on(Local::now().date_naive())
    }

    pub fn focus_minutes_on(&self, day: NaiveDate) -> f64 {
        self.records
            .iter()
            .filter(|r| r.phase == Phase::Work)
            .filter(|r| Self::record_day(r) == Some(day))
            .map(|r| r.elapsed_seconds as f64 / 60.0)
            .sum()
    }

    pub fn focus_minutes_today(&self) -> f64 {
        self.focus_minutes_on(Local::now().date_naive())
    }

    pub fn focus_hours_this_week(&self) -> f64 {
        let now = Local::now().date_naive();
        let weekday = now.weekday().num_days_from_sunday();
        let week_start = now - chrono::Duration::days(weekday as i64);
        self.records
            .iter()
            .filter(|r| r.phase == Phase::Work)
            .filter(|r| {
                Self::record_day(r)
                    .map(|d| d >= week_start)
                    .unwrap_or(false)
            })
            .map(|r| r.elapsed_seconds as f64 / 3600.0)
            .sum()
    }

    pub fn current_streak_days(&self) -> u32 {
        let mut streak = 0u32;
        let mut day = Local::now().date_naive();
        while self.focus_sessions_on(day) > 0 {
            streak += 1;
            day -= chrono::Duration::days(1);
        }
        streak
    }

    pub fn last_days(&self, days: u32) -> Vec<DayMinutes> {
        let today = Local::now().date_naive();
        (0..days)
            .rev()
            .map(|i| {
                let day = today - chrono::Duration::days(i as i64);
                DayMinutes {
                    day: day.format("%Y-%m-%d").to_string(),
                    minutes: self.focus_minutes_on(day),
                }
            })
            .collect()
    }

    pub fn today_stats(&self) -> TodayStats {
        TodayStats {
            sessions: self.focus_sessions_today(),
            minutes: self.focus_minutes_today(),
            streak: self.current_streak_days(),
        }
    }

    pub fn insights(&self) -> InsightsData {
        InsightsData {
            week_hours: self.focus_hours_this_week(),
            streak: self.current_streak_days(),
            last_days: self.last_days(90),
        }
    }

    pub fn recent_sessions(&self, limit: usize) -> Vec<crate::models::RecentSession> {
        self.records
            .iter()
            .rev()
            .filter(|r| r.phase == Phase::Work)
            .take(limit)
            .map(|r| crate::models::RecentSession {
                start_local: r.start_local.clone(),
                end_local: r.end_local.clone(),
                preset_name: r.preset_name.clone(),
                elapsed_seconds: r.elapsed_seconds,
                completed: r.completed,
            })
            .collect()
    }

    pub fn hourly_focus_today(&self) -> Vec<HourMinutes> {
        let today = Local::now().date_naive();
        let mut buckets = [0.0f64; 24];
        for r in &self.records {
            if r.phase != Phase::Work {
                continue;
            }
            let Some(day) = Self::record_day(r) else {
                continue;
            };
            if day != today {
                continue;
            }
            let hour = r
                .start_local
                .split('T')
                .nth(1)
                .and_then(|t| t.split(':').next())
                .and_then(|h| h.parse::<u32>().ok())
                .unwrap_or(0)
                .min(23);
            buckets[hour as usize] += r.elapsed_seconds as f64 / 60.0;
        }
        (0..24)
            .map(|hour| HourMinutes {
                hour,
                minutes: buckets[hour as usize],
            })
            .collect()
    }
}
