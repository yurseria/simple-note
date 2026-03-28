mod commands;
mod menu;

use tauri::Manager;
use tauri_plugin_store::StoreExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::read_file_with_encoding,
            commands::write_file_with_encoding,
            commands::get_settings,
            commands::set_setting,
            commands::get_platform,
            commands::get_locale,
            commands::rebuild_menu,
            commands::toggle_devtools,
            commands::toggle_fullscreen,
        ])
        .setup(|app| {
            // Initialize settings store
            let store = app.store("settings.json")?;
            if store.get("editor.fontFamily").is_none() {
                store.set("editor.fontFamily", serde_json::Value::String("Pretendard".into()));
                store.set("editor.fontSize", serde_json::Value::Number(14.into()));
                store.set("editor.lineNumbersFontSize", serde_json::Value::Number(10.into()));
                store.set("editor.theme", serde_json::Value::String("dark".into()));
                store.set("editor.infoBarMode", serde_json::Value::String("hud".into()));
                store.set("editor.showLineNumbers", serde_json::Value::Bool(false));
                store.set("editor.smartSubstitutions", serde_json::Value::Bool(false));
                store.set("editor.spellingCheck", serde_json::Value::Bool(false));
                store.set("editor.useSpacesForTabs", serde_json::Value::Bool(false));
                store.set("editor.tabSize", serde_json::Value::Number(4.into()));
                store.set("editor.countWhitespacesInChars", serde_json::Value::Bool(false));
                store.set("editor.keepIndentOnNewLines", serde_json::Value::Bool(true));
                store.set("general.doubleEscToLeaveFullScreen", serde_json::Value::Bool(false));
                store.save()?;
            }

            // Detect language for menu
            #[allow(unused_variables)]
            let lang = store
                .get("language")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .unwrap_or_else(|| {
                    let locale = sys_locale::get_locale().unwrap_or_else(|| "en".to_string());
                    if locale.to_lowercase().starts_with("ko") {
                        "ko".to_string()
                    } else {
                        "en".to_string()
                    }
                });

            drop(store);

            // Platform-specific window setup
            #[cfg(target_os = "macos")]
            {
                use tauri::TitleBarStyle;

                if let Some(win) = app.get_webview_window("main") {
                    win.set_title_bar_style(TitleBarStyle::Overlay).unwrap();
                }

                let handle = app.handle().clone();
                let native_menu = menu::build_menu(&handle, &lang)?;
                app.set_menu(native_menu)?;

                app.on_menu_event(move |app_handle, event| {
                    menu::handle_menu_event(app_handle, event);
                });
            }

            #[cfg(target_os = "windows")]
            {
                if let Some(win) = app.get_webview_window("main") {
                    win.set_decorations(false).unwrap();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
