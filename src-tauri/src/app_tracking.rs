use std::path::Path;



#[cfg(windows)]

use windows::Win32::Foundation::HWND;



#[derive(Debug, Clone)]

pub struct ForegroundApp {

    pub name: String,

    pub exe_path: Option<String>,

}



pub fn foreground_app() -> Option<ForegroundApp> {

    foreground_app_impl()

}



#[cfg(windows)]

fn foreground_app_impl() -> Option<ForegroundApp> {

    use windows::core::PWSTR;

    use windows::Win32::Foundation::CloseHandle;

    use windows::Win32::System::Threading::{

        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,

        PROCESS_QUERY_LIMITED_INFORMATION,

    };

    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};



    unsafe {

        let hwnd = GetForegroundWindow();

        if hwnd.0.is_null() {

            return None;

        }



        let mut pid = 0u32;

        GetWindowThreadProcessId(hwnd, Some(&mut pid));

        if pid == 0 {

            return None;

        }



        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;



        let mut buf = [0u16; 1024];

        let mut size = buf.len() as u32;

        let path = if QueryFullProcessImageNameW(

            handle,

            PROCESS_NAME_WIN32,

            PWSTR(buf.as_mut_ptr()),

            &mut size,

        )

        .is_ok()

        && size > 0

        {

            String::from_utf16_lossy(&buf[..size as usize])

        } else {

            String::new()

        };

        let _ = CloseHandle(handle);



        if path.is_empty() {

            return foreground_from_window(hwnd);

        }



        if is_self_process(&path) {

            return None;

        }



        let exe_name = Path::new(&path)

            .file_name()

            .and_then(|s| s.to_str())

            .unwrap_or("");



        // UWP / Microsoft Store apps are hosted inside ApplicationFrameHost.

        if exe_name.eq_ignore_ascii_case("ApplicationFrameHost.exe") {

            return foreground_from_window(hwnd);

        }



        Some(ForegroundApp {

            name: prettify_app_name(exe_name),

            exe_path: Some(path),

        })

    }

}



#[cfg(windows)]

unsafe fn foreground_from_window(hwnd: HWND) -> Option<ForegroundApp> {

    use windows::Win32::UI::WindowsAndMessaging::GetWindowTextW;



    let mut title = [0u16; 512];

    let len = GetWindowTextW(hwnd, &mut title);

    if len == 0 {

        return None;

    }



    let raw = String::from_utf16_lossy(&title[..len as usize]);

    let name = clean_window_title(raw.trim());

    if name.is_empty() || name.eq_ignore_ascii_case("Pomo Fomo") {

        return None;

    }

    Some(ForegroundApp {

        name,

        exe_path: None,

    })

}



#[cfg(windows)]

fn is_self_process(path: &str) -> bool {

    let lower = path.to_lowercase();

    lower.contains("pomofomo")

}



#[cfg(not(windows))]

fn foreground_app_impl() -> Option<ForegroundApp> {

    None

}



/// Window titles are often "Document - App Name"; prefer the trailing segment.

fn clean_window_title(title: &str) -> String {

    if title.eq_ignore_ascii_case("Pomo Fomo") {

        return String::new();

    }



    if let Some((_left, right)) = title.rsplit_once(" - ") {

        let right = right.trim();

        if !right.is_empty() && right.len() < 64 {

            return right.to_string();

        }

    }



    title.to_string()

}



fn prettify_app_name(raw: &str) -> String {

    let stem = Path::new(raw)

        .file_stem()

        .and_then(|s| s.to_str())

        .unwrap_or(raw);



    match stem.to_lowercase().as_str() {

        "chrome" => "Google Chrome".into(),

        "msedge" => "Microsoft Edge".into(),

        "firefox" => "Firefox".into(),

        "code" => "Visual Studio Code".into(),

        "cursor" => "Cursor".into(),

        "devenv" => "Visual Studio".into(),

        "windowsterminal" | "wt" => "Terminal".into(),

        "powershell" => "PowerShell".into(),

        "cmd" => "Command Prompt".into(),

        "slack" => "Slack".into(),

        "zoom" => "Zoom".into(),

        "teams" => "Microsoft Teams".into(),

        "ms-teams" => "Microsoft Teams".into(),

        "discord" => "Discord".into(),

        "notepad" => "Notepad".into(),

        "explorer" => "File Explorer".into(),

        "pomofomo" => "Pomo Fomo".into(),

        "spotify" => "Spotify".into(),

        "figma" => "Figma".into(),

        "olk" | "outlook" => "Outlook".into(),

        "winword" => "Word".into(),

        "excel" => "Excel".into(),

        "powerpnt" => "PowerPoint".into(),

        "snippingtool" => "Snipping Tool".into(),

        _ => title_case(stem),

    }

}



fn title_case(input: &str) -> String {

    input

        .split(|c: char| c == '-' || c == '_' || c == ' ')

        .filter(|part| !part.is_empty())

        .map(|part| {

            let mut chars = part.chars();

            match chars.next() {

                Some(first) => {

                    let upper: String = first.to_uppercase().collect();

                    upper + &chars.as_str().to_lowercase()

                }

                None => String::new(),

            }

        })

        .collect::<Vec<_>>()

        .join(" ")

}



#[cfg(test)]

mod tests {

    use super::*;



    #[test]

    fn clean_window_title_prefers_app_suffix() {

        assert_eq!(

            clean_window_title("main.ts - Visual Studio Code"),

            "Visual Studio Code"

        );

    }



    #[test]

    fn prettify_known_apps() {

        assert_eq!(prettify_app_name("Cursor.exe"), "Cursor");

        assert_eq!(prettify_app_name("msedge"), "Microsoft Edge");

    }

}

