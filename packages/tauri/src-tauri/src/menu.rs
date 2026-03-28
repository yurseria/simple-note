#![allow(dead_code)]
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    AppHandle, Emitter, Manager, Wry,
};
use tauri_plugin_store::StoreExt;

pub fn build_menu(app: &AppHandle, lang: &str) -> tauri::Result<tauri::menu::Menu<Wry>> {
    let is_ko = lang.to_lowercase().starts_with("ko");

    // ── Labels ──────────────────────────────────────────────
    let (file, edit, view, go, help_label) = if is_ko {
        ("파일", "편집", "보기", "이동", "도움말")
    } else {
        ("File", "Edit", "View", "Go", "Help")
    };

    let (new_tab, open, save, save_as, close_tab) = if is_ko {
        ("새 탭 열기", "파일 열기...", "저장", "다른 이름으로 저장...", "탭 닫기")
    } else {
        ("New Tab", "Open File...", "Save", "Save As...", "Close Tab")
    };

    let (find, replace) = if is_ko {
        ("찾기...", "바꾸기...")
    } else {
        ("Find...", "Replace...")
    };

    let (recent_files_label, no_recent, clear_recent) = if is_ko {
        ("최근 파일", "최근 파일 없음", "최근 파일 목록 지우기")
    } else {
        ("Recent Files", "No Recent Files", "Clear Recent Files")
    };

    let (appearance, toggle_line_numbers) = if is_ko {
        ("모양", "줄 번호 표시/숨기기")
    } else {
        ("Appearance", "Toggle Line Numbers")
    };

    let (theme_label, theme_light, theme_dark) = if is_ko {
        ("테마", "밝게 (Light)", "어둡게 (Dark)")
    } else {
        ("Theme", "Light", "Dark")
    };

    let (info_bar_style, floating_hud, status_bar) = if is_ko {
        ("정보 표시줄 스타일", "플로팅 HUD", "상태 표시줄 (고정)")
    } else {
        ("Info Bar Style", "Floating HUD", "Status Bar")
    };

    let (lang_mode, plain_text, markdown_label) = if is_ko {
        ("언어 모드", "일반 텍스트", "마크다운")
    } else {
        ("Language Mode", "Plain Text", "Markdown")
    };

    let (ui_lang, korean, english) = if is_ko {
        ("UI 언어", "한국어", "English")
    } else {
        ("UI Language", "한국어", "English")
    };

    let (zoom_label, zoom_in, zoom_out, zoom_reset) = if is_ko {
        ("확대/축소", "확대", "축소", "기본값으로 복원")
    } else {
        ("Zoom", "Zoom In", "Zoom Out", "Reset Zoom")
    };

    let toggle_full_screen = if is_ko { "전체 화면 전환" } else { "Toggle Full Screen" };
    let goto_line = if is_ko { "지정 줄로 이동..." } else { "Go to Line..." };
    let toggle_preview = if is_ko { "마크다운 미리보기 전환" } else { "Toggle Markdown Preview" };
    let dev_tools = if is_ko { "개발자 도구 전환" } else { "Toggle Developer Tools" };

    macro_rules! menu_item {
        ($id:expr, $label:expr) => {
            MenuItemBuilder::new($label).id($id).build(app)?
        };
        ($id:expr, $label:expr, $accel:expr) => {
            MenuItemBuilder::new($label)
                .id($id)
                .accelerator($accel)
                .build(app)?
        };
    }

    // ── Recent files submenu ──────────────────────────────────
    let mut recent_sub = SubmenuBuilder::new(app, recent_files_label);
    let recent_files: Vec<String> = app
        .store("settings.json")
        .ok()
        .and_then(|s| s.get("general.recentFiles"))
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    if recent_files.is_empty() {
        let disabled = MenuItemBuilder::new(no_recent).enabled(false).build(app)?;
        recent_sub = recent_sub.item(&disabled);
    } else {
        for fp in &recent_files {
            let file_name = fp.rsplit(['/', '\\']).next().unwrap_or(fp);
            let id = format!("menu:openRecent:{}", fp);
            let item = MenuItemBuilder::new(file_name).id(id).build(app)?;
            recent_sub = recent_sub.item(&item);
        }
        recent_sub = recent_sub.separator();
        recent_sub = recent_sub.item(&menu_item!("menu:clearRecentFiles", clear_recent));
    }
    let recent_submenu = recent_sub.build()?;

    // ── File ────────────────────────────────────────────────
    let file_menu = SubmenuBuilder::new(app, file)
        .item(&menu_item!("menu:newTab", new_tab, "CmdOrCtrl+T"))
        .item(&menu_item!("menu:open", open, "CmdOrCtrl+O"))
        .item(&recent_submenu)
        .separator()
        .item(&menu_item!("menu:save", save, "CmdOrCtrl+S"))
        .item(&menu_item!("menu:saveAs", save_as, "CmdOrCtrl+Shift+S"))
        .separator()
        .item(&menu_item!("menu:closeTab", close_tab, "CmdOrCtrl+W"))
        .build()?;

    // ── Edit ────────────────────────────────────────────────
    let edit_menu = SubmenuBuilder::new(app, edit)
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .separator()
        .select_all()
        .separator()
        .item(&menu_item!("menu:find", find, "CmdOrCtrl+F"))
        .item(&menu_item!("menu:replace", replace, "CmdOrCtrl+H"))
        .build()?;

    // ── View submenus ───────────────────────────────────────
    let info_bar_sub = SubmenuBuilder::new(app, info_bar_style)
        .item(&menu_item!("menu:setInfoBarMode:hud", floating_hud))
        .item(&menu_item!("menu:setInfoBarMode:status", status_bar))
        .build()?;

    let appearance_sub = SubmenuBuilder::new(app, appearance)
        .item(&menu_item!("menu:toggleLineNumbers", toggle_line_numbers, "CmdOrCtrl+Shift+L"))
        .item(&info_bar_sub)
        .build()?;

    let theme_sub = SubmenuBuilder::new(app, theme_label)
        .item(&menu_item!("menu:setTheme:light", theme_light))
        .item(&menu_item!("menu:setTheme:dark", theme_dark))
        .build()?;

    let lang_mode_sub = SubmenuBuilder::new(app, lang_mode)
        .item(&menu_item!("menu:setLanguage:plaintext", plain_text))
        .item(&menu_item!("menu:setLanguage:markdown", markdown_label))
        .build()?;

    let ui_lang_sub = SubmenuBuilder::new(app, ui_lang)
        .item(&menu_item!("menu:setUILanguage:ko", korean))
        .item(&menu_item!("menu:setUILanguage:en", english))
        .build()?;

    let zoom_sub = SubmenuBuilder::new(app, zoom_label)
        .item(&menu_item!("menu:fontSizeUp", zoom_in, "CmdOrCtrl+Plus"))
        .item(&menu_item!("menu:fontSizeDown", zoom_out, "CmdOrCtrl+-"))
        .item(&menu_item!("menu:fontSizeReset", zoom_reset, "CmdOrCtrl+0"))
        .build()?;

    let view_menu = SubmenuBuilder::new(app, view)
        .item(&appearance_sub)
        .item(&theme_sub)
        .item(&lang_mode_sub)
        .item(&ui_lang_sub)
        .separator()
        .item(&zoom_sub)
        .separator()
        .item(&menu_item!("menu:toggleFullScreen", toggle_full_screen))
        .item(&menu_item!("menu:toggleMarkdownPreview", toggle_preview, "CmdOrCtrl+Shift+M"))
        .build()?;

    // ── Go ──────────────────────────────────────────────────
    let go_menu = SubmenuBuilder::new(app, go)
        .item(&menu_item!("menu:gotoLine", goto_line, "CmdOrCtrl+G"))
        .build()?;

    // ── Help ────────────────────────────────────────────────
    let help_menu = SubmenuBuilder::new(app, help_label)
        .item(&menu_item!("menu:toggleDevTools", dev_tools, "CmdOrCtrl+Alt+I"))
        .build()?;

    // ── Build final menu ────────────────────────────────────
    #[allow(unused_mut)]
    let mut builder = MenuBuilder::new(app);

    #[cfg(target_os = "macos")]
    {
        let app_menu = SubmenuBuilder::new(app, "Note")
            .about(None)
            .separator()
            .services()
            .separator()
            .hide()
            .hide_others()
            .show_all()
            .separator()
            .quit()
            .build()?;
        builder = builder.item(&app_menu);
    }

    let menu = builder
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&go_menu)
        .item(&help_menu)
        .build()?;

    Ok(menu)
}

pub fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let id = event.id().0.as_str();

    // Parse compound IDs like "menu:setTheme:dark" or "menu:openRecent:C:\path\file.md"
    let (event_name, payload) = {
        // menu:openRecent: 은 경로에 ':'가 포함될 수 있으므로 특별 처리
        if let Some(path) = id.strip_prefix("menu:openRecent:") {
            ("menu:openRecent".to_string(), Some(path.to_string()))
        } else {
            let parts: Vec<&str> = id.splitn(3, ':').collect();
            if parts.len() == 3 {
                let name = format!("{}:{}", parts[0], parts[1]);
                (name, Some(parts[2].to_string()))
            } else {
                (id.to_string(), None)
            }
        }
    };

    // Special handling for non-frontend events
    match event_name.as_str() {
        "menu:toggleFullScreen" => {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.is_fullscreen().map(|fs| win.set_fullscreen(!fs));
            }
            return;
        }
        "menu:toggleDevTools" => {
            if let Some(win) = app.get_webview_window("main") {
                if win.is_devtools_open() {
                    win.close_devtools();
                } else {
                    win.open_devtools();
                }
            }
            return;
        }
        _ => {}
    }

    // Emit to frontend
    if let Some(win) = app.get_webview_window("main") {
        let _ = match payload {
            Some(p) => win.emit("menu-event", serde_json::json!({ "action": event_name, "payload": p })),
            None => win.emit("menu-event", serde_json::json!({ "action": event_name })),
        };
    }
}
