use std::fs;
use std::path::PathBuf;

pub fn data_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("PomoFomo")
}

pub fn path_for(file_name: &str) -> PathBuf {
    data_dir().join(file_name)
}

pub fn load<T>(file_name: &str, fallback: impl FnOnce() -> T) -> T
where
    T: serde::de::DeserializeOwned,
{
    let path = path_for(file_name);
    if !path.exists() {
        return fallback();
    }
    match fs::read_to_string(&path) {
        Ok(json) if !json.trim().is_empty() => {
            serde_json::from_str(&json).unwrap_or_else(|_| fallback())
        }
        _ => fallback(),
    }
}

pub fn save<T>(file_name: &str, value: &T)
where
    T: serde::Serialize,
{
    let path = path_for(file_name);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(value) {
        let _ = fs::write(path, json);
    }
}
