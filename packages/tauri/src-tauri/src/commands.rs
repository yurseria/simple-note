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
    } else {
        store.set(&key, value);
    }

    store.save().map_err(|e| e.to_string())
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
