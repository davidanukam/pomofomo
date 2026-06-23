#[cfg(windows)]
use std::collections::HashMap;
#[cfg(windows)]
use std::sync::Mutex;

#[cfg(windows)]
static ICON_CACHE: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

pub fn icon_data_url_for_exe(exe_path: &str) -> Option<String> {
    icon_data_url_for_exe_impl(exe_path)
}

#[cfg(windows)]
fn icon_data_url_for_exe_impl(exe_path: &str) -> Option<String> {
    use getfileicon::prelude::Image;

    if exe_path.trim().is_empty() {
        return None;
    }

    let mut cache_guard = ICON_CACHE.lock().ok()?;
    if cache_guard.is_none() {
        *cache_guard = Some(HashMap::new());
    }
    let cache = cache_guard.as_mut()?;

    if let Some(icon) = cache.get(exe_path) {
        return Some(icon.clone());
    }

    let image = Image::try_new_from_file(exe_path, 32, 32).ok()?;
    let png = image.as_base64_png().ok()?;
    if png.is_default {
        return None;
    }

    cache.insert(exe_path.to_string(), png.base64.clone());
    Some(png.base64)
}

#[cfg(not(windows))]
fn icon_data_url_for_exe_impl(_exe_path: &str) -> Option<String> {
    None
}
