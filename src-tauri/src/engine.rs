use chrono::Local;

use crate::history::HistoryService;
use crate::models::{Phase, SessionRecord, TimerPreset, TimerState};
use crate::settings::SettingsService;

pub struct PhaseChange {
    pub finished: Phase,
    pub next: Phase,
    pub completed_naturally: bool,
}

pub struct PomodoroEngine {
    settings: SettingsService,
    history: HistoryService,
    phase: Phase,
    planned_seconds: u32,
    elapsed_seconds: u32,
    is_running: bool,
    completed_work_in_cycle: u32,
    preset: TimerPreset,
    phase_start_local: String,
}

impl PomodoroEngine {
    pub fn new(settings: SettingsService, history: HistoryService) -> Self {
        let preset = settings.selected_preset();
        Self {
            settings,
            history,
            phase: Phase::Idle,
            planned_seconds: 0,
            elapsed_seconds: 0,
            is_running: false,
            completed_work_in_cycle: 0,
            preset,
            phase_start_local: Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
        }
    }

    pub fn refresh_preset(&mut self) {
        self.preset = self.settings.selected_preset();
    }

    pub fn start_or_pause(&mut self) {
        if self.is_running {
            self.pause();
        } else {
            self.start();
        }
    }

    pub fn start(&mut self) {
        if self.phase == Phase::Idle {
            self.begin_phase(Phase::Work, true);
        }
        self.is_running = true;
    }

    pub fn pause(&mut self) {
        self.is_running = false;
    }

    pub fn reset(&mut self) {
        if self.phase == Phase::Idle {
            return;
        }
        self.elapsed_seconds = 0;
        self.phase_start_local = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    }

    pub fn start_break(&mut self) {
        if self.phase != Phase::Idle {
            return;
        }
        self.begin_phase(Phase::ShortBreak, false);
        self.is_running = self.settings.settings.auto_start_breaks;
    }

    pub fn skip(&mut self) -> Option<PhaseChange> {
        if self.phase == Phase::Idle {
            return None;
        }
        let finished = self.phase;
        self.record_current(false);
        Some(self.advance_from(finished, false))
    }

    pub fn end_session(&mut self) {
        if self.phase == Phase::Idle {
            return;
        }
        self.record_current(false);
        self.is_running = false;
        self.phase = Phase::Idle;
        self.elapsed_seconds = 0;
        self.planned_seconds = 0;
    }

    /// Returns phase change info when a phase completes naturally.
    pub fn tick(&mut self) -> Option<PhaseChange> {
        if !self.is_running {
            return None;
        }

        if self.phase == Phase::Work && self.settings.settings.analytics_enabled {
            if let Some(app) = crate::app_tracking::foreground_app() {
                self.history
                    .record_app_second(&app.name, app.exe_path.as_deref());
            }
        }

        self.elapsed_seconds += 1;
        if self.elapsed_seconds >= self.planned_seconds {
            let finished = self.phase;
            self.record_current(true);
            Some(self.advance_from(finished, true))
        } else {
            None
        }
    }

    fn advance_from(&mut self, finished: Phase, completed_naturally: bool) -> PhaseChange {
        let next = if finished == Phase::Work {
            self.completed_work_in_cycle += 1;
            let long_due = self.completed_work_in_cycle
                % self.preset.sessions_before_long_break.max(1)
                == 0;
            if long_due {
                Phase::LongBreak
            } else {
                Phase::ShortBreak
            }
        } else {
            if finished == Phase::LongBreak {
                self.completed_work_in_cycle = 0;
            }
            Phase::Work
        };

        self.begin_phase(next, false);

        let auto_start = match next {
            Phase::Work => self.settings.settings.auto_start_next_work,
            Phase::ShortBreak | Phase::LongBreak => self.settings.settings.auto_start_breaks,
            Phase::Idle => false,
        };
        self.is_running = auto_start;

        PhaseChange {
            finished,
            next,
            completed_naturally,
        }
    }

    fn begin_phase(&mut self, phase: Phase, reset_cycle: bool) {
        if reset_cycle {
            self.completed_work_in_cycle = 0;
        }
        self.phase = phase;
        self.planned_seconds = self.preset.minutes_for(phase).max(1) * 60;
        self.elapsed_seconds = 0;
        self.phase_start_local = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    }

    fn record_current(&mut self, completed: bool) {
        if self.phase == Phase::Idle || self.elapsed_seconds == 0 {
            return;
        }
        if !self.settings.settings.analytics_enabled {
            return;
        }
        self.history.flush_app_usage();
        let now = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
        self.history.add(SessionRecord {
            start_local: self.phase_start_local.clone(),
            end_local: now,
            phase: self.phase,
            planned_seconds: self.planned_seconds,
            elapsed_seconds: self.elapsed_seconds,
            completed,
            preset_name: self.preset.name.clone(),
        });
    }

    pub fn remaining_seconds(&self) -> u32 {
        self.planned_seconds.saturating_sub(self.elapsed_seconds)
    }

    pub fn progress(&self) -> f64 {
        if self.planned_seconds == 0 {
            0.0
        } else {
            (self.elapsed_seconds as f64 / self.planned_seconds as f64).clamp(0.0, 1.0)
        }
    }

    pub fn time_text(&self) -> String {
        let seconds = if self.phase == Phase::Idle {
            self.preset.work_minutes * 60
        } else {
            self.remaining_seconds()
        };
        format!("{:02}:{:02}", seconds / 60, seconds % 60)
    }

    pub fn state(&self) -> TimerState {
        TimerState {
            phase: self.phase,
            planned_seconds: self.planned_seconds,
            elapsed_seconds: self.elapsed_seconds,
            remaining_seconds: self.remaining_seconds(),
            progress: self.progress(),
            is_running: self.is_running,
            time_text: self.time_text(),
            phase_label: self.phase.label().into(),
            completed_work_in_cycle: self.completed_work_in_cycle,
            sessions_before_long_break: self.preset.sessions_before_long_break,
            preset_name: self.preset.name.clone(),
        }
    }

    pub fn settings_mut(&mut self) -> &mut SettingsService {
        &mut self.settings
    }

    pub fn settings(&self) -> &SettingsService {
        &self.settings
    }

    pub fn history(&self) -> &HistoryService {
        &self.history
    }

    pub fn history_mut(&mut self) -> &mut HistoryService {
        &mut self.history
    }
}
