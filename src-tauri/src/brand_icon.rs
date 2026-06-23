use std::sync::OnceLock;

use tauri::image::Image;
use tauri::{AppHandle, Manager};

struct BrandIcons {
    light: Image<'static>,
    dark: Image<'static>,
}

fn icons() -> &'static BrandIcons {
    static CACHE: OnceLock<BrandIcons> = OnceLock::new();
    CACHE.get_or_init(|| BrandIcons {
        light: load_brand_png(include_bytes!("../icons/brand/light.png")),
        dark: load_brand_png(include_bytes!("../icons/brand/dark.png")),
    })
}

fn load_brand_png(bytes: &'static [u8]) -> Image<'static> {
    let image = Image::from_bytes(bytes).expect("brand icon");
    round_corners(image.to_owned())
}

fn round_corners(image: Image<'static>) -> Image<'static> {
    let width = image.width();
    let height = image.height();
    let radius = ((width.min(height) as f32) * 0.22).max(2.0);
    let mut rgba = image.rgba().to_vec();

    for y in 0..height {
        for x in 0..width {
            let alpha = corner_alpha(x as f32 + 0.5, y as f32 + 0.5, width, height, radius);
            let idx = ((y * width + x) * 4) as usize;
            rgba[idx + 3] = ((rgba[idx + 3] as f32) * alpha).round() as u8;
        }
    }

    Image::new_owned(rgba, width, height)
}

fn corner_alpha(x: f32, y: f32, width: u32, height: u32, radius: f32) -> f32 {
    let w = width as f32;
    let h = height as f32;

    let (cx, cy) = if x < radius && y < radius {
        (radius, radius)
    } else if x > w - radius && y < radius {
        (w - radius, radius)
    } else if x < radius && y > h - radius {
        (radius, h - radius)
    } else if x > w - radius && y > h - radius {
        (w - radius, h - radius)
    } else {
        return 1.0;
    };

    let dist = ((x - cx).powi(2) + (y - cy).powi(2)).sqrt();
    if dist <= radius - 0.5 {
        1.0
    } else if dist >= radius + 0.5 {
        0.0
    } else {
        (radius + 0.5 - dist).clamp(0.0, 1.0)
    }
}

pub fn icon_for_theme(dark_mode: bool) -> Image<'static> {
    let brand = icons();
    if dark_mode {
        brand.dark.clone()
    } else {
        brand.light.clone()
    }
}

pub fn apply_brand_icon(app: &AppHandle, dark_mode: bool) {
    let icon = icon_for_theme(dark_mode);
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_icon(Some(icon.clone()));
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_icon(icon);
    }
}
