use crate::models::{AppSettings, TimerPreset};
use crate::store;

const FILE_NAME: &str = "settings.json";

pub struct SettingsService {
    pub settings: AppSettings,
}

impl SettingsService {
    pub fn new() -> Self {
        let mut settings = store::load(FILE_NAME, AppSettings::default);
        let migrated = migrate_settings(&mut settings);
        let mut service = Self { settings };
        if migrated {
            service.save();
        }
        service
    }

    pub fn save(&mut self) {
        store::save(FILE_NAME, &self.settings);
    }

    pub fn all_presets(&self) -> Vec<TimerPreset> {
        let mut list = TimerPreset::defaults();
        list.extend(self.settings.custom_presets.clone());
        list
    }

    pub fn selected_preset(&self) -> TimerPreset {
        let name = &self.settings.selected_preset_name;
        self.all_presets()
            .into_iter()
            .find(|p| &p.name == name)
            .unwrap_or_else(|| TimerPreset::defaults().remove(0))
    }
}

fn migrate_settings(settings: &mut AppSettings) -> bool {
    if settings.hotkey_reset.ctrl
        && settings.hotkey_reset.alt
        && !settings.hotkey_reset.shift
        && !settings.hotkey_reset.win
        && settings.hotkey_reset.key.eq_ignore_ascii_case("E")
    {
        settings.hotkey_reset.key = "R".into();
        return true;
    }
    false
}
