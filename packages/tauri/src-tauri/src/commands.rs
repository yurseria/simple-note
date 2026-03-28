use chardetng::EncodingDetector;
use encoding_rs::Encoding;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

#[cfg(target_os = "macos")]
use crate::menu;

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadResult {
    pub content: String,
    pub encoding: String,
    pub language: String,
}

#[tauri::command]
pub fn read_file_with_encoding(file_path: String) -> Result<ReadResult, String> {
    let bytes = fs::read(&file_path).map_err(|e| e.to_string())?;

    // Detect encoding
    let mut detector = EncodingDetector::new();
    detector.feed(&bytes, true);
    let encoding = detector.guess(None, true);
    let encoding_name = encoding.name().to_string();

    // Decode
    let (content, _, _) = encoding.decode(&bytes);

    // Detect language from extension
    let ext = Path::new(&file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let language = match ext.as_str() {
        "md" | "markdown" => "markdown",
        _ => "plaintext",
    };

    Ok(ReadResult {
        content: content.into_owned(),
        encoding: encoding_name,
        language: language.to_string(),
    })
}

#[tauri::command]
pub fn write_file_with_encoding(
    file_path: String,
    content: String,
    encoding: String,
) -> Result<(), String> {
    let enc = Encoding::for_label(encoding.as_bytes()).unwrap_or(encoding_rs::UTF_8);
    let (bytes, _, _) = enc.encode(&content);
    fs::write(&file_path, &*bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<serde_json::Value, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;

    let general = serde_json::json!({
        "doubleEscToLeaveFullScreen": store.get("general.doubleEscToLeaveFullScreen").unwrap_or(serde_json::Value::Bool(false)),
        "recentFiles": store.get("general.recentFiles").unwrap_or(serde_json::Value::Array(vec![])),
    });

    let editor = serde_json::json!({
        "fontFamily": store.get("editor.fontFamily").unwrap_or(serde_json::Value::String("Pretendard".into())),
        "fontSize": store.get("editor.fontSize").unwrap_or(serde_json::Value::Number(14.into())),
        "lineNumbersFontSize": store.get("editor.lineNumbersFontSize").unwrap_or(serde_json::Value::Number(10.into())),
        "theme": store.get("editor.theme").unwrap_or(serde_json::Value::String("dark".into())),
        "infoBarMode": store.get("editor.infoBarMode").unwrap_or(serde_json::Value::String("hud".into())),
        "showLineNumbers": store.get("editor.showLineNumbers").unwrap_or(serde_json::Value::Bool(false)),
        "smartSubstitutions": store.get("editor.smartSubstitutions").unwrap_or(serde_json::Value::Bool(false)),
        "spellingCheck": store.get("editor.spellingCheck").unwrap_or(serde_json::Value::Bool(false)),
        "useSpacesForTabs": store.get("editor.useSpacesForTabs").unwrap_or(serde_json::Value::Bool(false)),
        "tabSize": store.get("editor.tabSize").unwrap_or(serde_json::Value::Number(4.into())),
        "countWhitespacesInChars": store.get("editor.countWhitespacesInChars").unwrap_or(serde_json::Value::Bool(false)),
        "keepIndentOnNewLines": store.get("editor.keepIndentOnNewLines").unwrap_or(serde_json::Value::Bool(true)),
    });

    // Language auto-detection on first launch
    let language = match store.get("language") {
        Some(lang) => lang,
        None => {
            let locale = sys_locale::get_locale().unwrap_or_else(|| "en".to_string());
            let detected = if locale.to_lowercase().starts_with("ko") {
                "ko"
            } else {
                "en"
            };
            store.set("language", serde_json::Value::String(detected.to_string()));
            let _ = store.save();
            serde_json::Value::String(detected.to_string())
        }
    };

    let settings = serde_json::json!({
        "general": general,
        "editor": editor,
        "language": language,
    });

    Ok(settings)
}

#[tauri::command]
pub fn set_setting(app: AppHandle, key: String, value: serde_json::Value) -> Result<(), String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;

    if key == "editor" {
        // When setting the whole editor object, flatten into individual keys
        if let serde_json::Value::Object(map) = &value {
            for (k, v) in map {
                store.set(format!("editor.{}", k), v.clone());
            }
        }
    } else if key == "general" {
        if let serde_json::Value::Object(map) = &value {
            for (k, v) in map {
                store.set(format!("general.{}", k), v.clone());
            }
        }
        // general 설정 변경 시 메뉴 재빌드 (최근 파일 서브메뉴 갱신)
        #[cfg(target_os = "macos")]
        {
            let lang = store
                .get("language")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .unwrap_or_else(|| "en".to_string());
            if let Ok(native_menu) = crate::menu::build_menu(&app, &lang) {
                let _ = app.set_menu(native_menu);
            }
        }
    } else {
        store.set(&key, value);
    }

    store.save().map_err(|e| e.to_string())
}

/// 3버튼 닫기 확인 다이얼로그: 저장 / 저장하지 않고 닫기 / 취소
/// 반환: 0 = save, 1 = close without saving, 2 = cancel
#[tauri::command]
pub fn confirm_close_dialog(app: AppHandle, file_name: String) -> i32 {
    let store = app.store("settings.json").ok();
    let is_ko = store
        .and_then(|s| s.get("language"))
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| "en".to_string())
        .to_lowercase()
        .starts_with("ko");

    let (title, message, save, dont_save, cancel) = if is_ko {
        ("변경사항 저장", format!("\"{}\"의 변경사항을 저장하겠습니까?", file_name),
         "저장", "저장하지 않고 닫기", "취소")
    } else {
        ("Unsaved Changes", format!("Do you want to save changes to \"{}\"?", file_name),
         "Save", "Close Without Saving", "Cancel")
    };

    let result = rfd::MessageDialog::new()
        .set_title(title)
        .set_description(&message)
        .set_level(rfd::MessageLevel::Warning)
        .set_buttons(rfd::MessageButtons::YesNoCancelCustom(
            save.to_string(),
            dont_save.to_string(),
            cancel.to_string(),
        ))
        .show();

    match result {
        rfd::MessageDialogResult::Custom(s) if s == save => 0,
        rfd::MessageDialogResult::Custom(s) if s == dont_save => 1,
        rfd::MessageDialogResult::Yes => 0,
        rfd::MessageDialogResult::No => 1,
        _ => 2, // cancel
    }
}

#[tauri::command]
pub fn save_clipboard_image(dir_path: String) -> Result<Option<String>, String> {
    use arboard::Clipboard;
    use image::ImageFormat;
    use std::io::Cursor;

    let mut clip = Clipboard::new().map_err(|e| e.to_string())?;
    let img = match clip.get_image() {
        Ok(img) => img,
        Err(_) => return Ok(None), // 클립보드에 이미지 없음
    };

    let images_dir = Path::new(&dir_path).join("images");
    if !images_dir.exists() {
        fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
    }

    let now = chrono::Local::now();
    let file_name = format!("paste-{}.png", now.format("%Y%m%d-%H%M%S"));
    let file_path = images_dir.join(&file_name);

    // arboard ImageData → PNG
    let rgba_img = image::RgbaImage::from_raw(
        img.width as u32,
        img.height as u32,
        img.bytes.into_owned(),
    )
    .ok_or("Failed to create image from clipboard data")?;

    let mut buf = Cursor::new(Vec::new());
    rgba_img
        .write_to(&mut buf, ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    fs::write(&file_path, buf.into_inner()).map_err(|e| e.to_string())?;

    Ok(Some(format!("./images/{}", file_name)))
}

#[tauri::command]
pub fn get_platform() -> String {
    if cfg!(target_os = "macos") {
        "darwin".to_string()
    } else if cfg!(target_os = "windows") {
        "win32".to_string()
    } else {
        "linux".to_string()
    }
}

#[tauri::command]
pub fn get_locale() -> String {
    sys_locale::get_locale().unwrap_or_else(|| "en".to_string())
}

#[tauri::command]
#[allow(unused_variables)]
pub fn rebuild_menu(app: AppHandle, lang: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let native_menu = menu::build_menu(&app, &lang).map_err(|e| e.to_string())?;
        app.set_menu(native_menu).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn toggle_devtools(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        if win.is_devtools_open() {
            win.close_devtools();
        } else {
            win.open_devtools();
        }
    }
}

#[tauri::command]
pub fn toggle_fullscreen(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.is_fullscreen().map(|fs| win.set_fullscreen(!fs));
    }
}
