mod commands;
mod menu;

use tauri::{Emitter, Manager};
use tauri_plugin_store::StoreExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::read_file_with_encoding,
            commands::write_file_with_encoding,
            commands::get_settings,
            commands::set_setting,
            commands::get_platform,
            commands::get_app_version,
            commands::open_external_url,
            commands::read_file_as_data_url,
            commands::copy_to_clipboard,
            commands::get_locale,
            commands::rebuild_menu,
            commands::toggle_devtools,
            commands::toggle_fullscreen,
            commands::confirm_close_dialog,
            commands::save_clipboard_image,
            commands::get_launch_files,
        ])
        .setup(|app| {
            // "다음으로 열기" 파일 경로 버퍼 초기화
            app.manage(commands::PendingFilePaths(std::sync::Mutex::new(vec![])));

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

                // 키 반복 입력 활성화 (macOS accent 팝업 비활성화)
                let _ = std::process::Command::new("defaults")
                    .args(["write", "-g", "ApplePressAndHoldEnabled", "-bool", "false"])
                    .output();

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
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // macOS "다음으로 열기" / Finder에서 파일을 앱으로 드래그할 때 발생
            if let tauri::RunEvent::Opened { urls } = event {
                let paths: Vec<String> = urls
                    .iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .filter_map(|p| p.to_str().map(|s| s.to_string()))
                    .collect();

                if paths.is_empty() {
                    return;
                }

                // 콜드 스타트: 프론트엔드가 아직 안 올라왔을 수 있으므로 버퍼에 저장
                if let Some(state) = app_handle.try_state::<commands::PendingFilePaths>() {
                    state
                        .0
                        .lock()
                        .unwrap_or_else(|e| e.into_inner())
                        .extend(paths.iter().cloned());
                }

                // 핫 스타트: 이미 실행 중이면 웹뷰에 이벤트 전송
                if let Some(win) = app_handle.get_webview_window("main") {
                    for path in &paths {
                        let _ = win.emit("file-open", path);
                    }
                }
            }
        });
}
