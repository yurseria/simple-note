import { Menu, BrowserWindow, app, ipcMain } from "electron";
import { store } from "./store";

const isMac = process.platform === "darwin";

export type MenuLanguage = "ko" | "en";

const T: Record<MenuLanguage, Record<string, string>> = {
  ko: {
    appAbout: `${app.name} 정보`,
    file: "파일",
    newTab: "새 탭 열기",
    open: "파일 열기...",
    save: "저장",
    saveAs: "다른 이름으로 저장...",
    closeTab: "탭 닫기",
    quit: "종료",
    edit: "편집",
    undo: "실행 취소",
    redo: "다시 실행",
    cut: "잘라내기",
    copy: "복사",
    paste: "붙여넣기",
    selectNext: "다음 일치 항목 선택 추가  (Cmd/Ctrl+D)",
    selectAll_occ: "모든 일치 항목 선택  (Cmd/Ctrl+Shift+L)",
    selectAll: "전체 선택",
    find: "찾기...",
    replace: "바꾸기...",
    recentFiles: "최근 파일",
    noRecentFiles: "최근 파일 없음",
    clearRecentFiles: "최근 파일 목록 지우기",
    view: "보기",
    appearance: "모양",
    toggleLineNumbers: "줄 번호 표시/숨기기",
    infoBarStyle: "정보 표시줄 스타일",
    floatingHud: "플로팅 HUD",
    statusBar: "상태 표시줄 (고정)",
    theme: "테마",
    themeLight: "밝게 (Light)",
    themeDark: "어둡게 (Dark)",
    languageMode: "언어 모드",
    plainText: "일반 텍스트",
    markdown: "마크다운",
    zoom: "확대/축소",
    zoomIn: "확대",
    zoomOut: "축소",
    zoomReset: "기본값으로 복원",
    toggleFullScreen: "전체 화면 전환",
    uiLanguage: "UI 언어",
    korean: "한국어",
    english: "English",
    go: "이동",
    gotoLine: "지정 줄로 이동...",
    help: "도움말",
    devTools: "개발자 도구 전환",
  },
  en: {
    appAbout: `About ${app.name}`,
    file: "File",
    newTab: "New Tab",
    open: "Open File...",
    save: "Save",
    saveAs: "Save As...",
    closeTab: "Close Tab",
    quit: "Quit",
    edit: "Edit",
    undo: "Undo",
    redo: "Redo",
    cut: "Cut",
    copy: "Copy",
    paste: "Paste",
    selectNext: "Add Next Occurrence to Selection  (Cmd/Ctrl+D)",
    selectAll_occ: "Select All Occurrences  (Cmd/Ctrl+Shift+L)",
    selectAll: "Select All",
    find: "Find...",
    replace: "Replace...",
    recentFiles: "Recent Files",
    noRecentFiles: "No Recent Files",
    clearRecentFiles: "Clear Recent Files",
    view: "View",
    appearance: "Appearance",
    toggleLineNumbers: "Toggle Line Numbers",
    infoBarStyle: "Info Bar Style",
    floatingHud: "Floating HUD",
    statusBar: "Status Bar",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    languageMode: "Language Mode",
    plainText: "Plain Text",
    markdown: "Markdown",
    zoom: "Zoom",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    zoomReset: "Reset Zoom",
    toggleFullScreen: "Toggle Full Screen",
    uiLanguage: "UI Language",
    korean: "한국어",
    english: "English",
    go: "Go",
    gotoLine: "Go to Line...",
    help: "Help",
    devTools: "Toggle Developer Tools",
  },
};

export function buildMenu(language: MenuLanguage = "ko"): void {
  const t = T[language];

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS 전용 앱 메뉴
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { label: t.appAbout, role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      id: "file",
      label: t.file,
      submenu: [
        {
          label: t.newTab,
          accelerator: "CmdOrCtrl+T",
          click: sendToRenderer("menu:newTab"),
        },
        {
          label: t.open,
          accelerator: "CmdOrCtrl+O",
          click: sendToRenderer("menu:open"),
        },
        {
          label: t.recentFiles,
          submenu: buildRecentFilesSubmenu(t),
        },
        { type: "separator" },
        {
          label: t.save,
          accelerator: "CmdOrCtrl+S",
          click: sendToRenderer("menu:save"),
        },
        {
          label: t.saveAs,
          accelerator: "CmdOrCtrl+Shift+S",
          click: sendToRenderer("menu:saveAs"),
        },
        { type: "separator" },
        {
          label: t.closeTab,
          accelerator: "CmdOrCtrl+W",
          click: sendToRenderer("menu:closeTab"),
        },
        ...(!isMac
          ? ([
              { type: "separator" },
              { label: t.quit, role: "quit" as const },
            ] as Electron.MenuItemConstructorOptions[])
          : []),
      ],
    },
    {
      id: "edit",
      label: t.edit,
      submenu: [
        { label: t.undo, accelerator: "CmdOrCtrl+Z", role: "undo" },
        { label: t.redo, accelerator: "CmdOrCtrl+Shift+Z", role: "redo" },
        { type: "separator" },
        { label: t.cut, accelerator: "CmdOrCtrl+X", role: "cut" },
        { label: t.copy, accelerator: "CmdOrCtrl+C", role: "copy" },
        { label: t.paste, accelerator: "CmdOrCtrl+V", role: "paste" },
        { type: "separator" },
        {
          label: t.selectNext,
          click: sendToRenderer("menu:selectNextOccurrence"),
        },
        {
          label: t.selectAll_occ,
          click: sendToRenderer("menu:selectAllOccurrences"),
        },
        { type: "separator" },
        { label: t.selectAll, accelerator: "CmdOrCtrl+A", role: "selectAll" },
        { type: "separator" },
        {
          label: t.find,
          accelerator: "CmdOrCtrl+F",
          click: sendToRenderer("menu:find"),
        },
        {
          label: t.replace,
          accelerator: "CmdOrCtrl+H",
          click: sendToRenderer("menu:replace"),
        },
      ],
    },
    {
      id: "view",
      label: t.view,
      submenu: [
        {
          label: t.appearance,
          submenu: [
            {
              label: t.toggleLineNumbers,
              accelerator: "CmdOrCtrl+Shift+L",
              click: sendToRenderer("menu:toggleLineNumbers"),
            },
            {
              label: t.infoBarStyle,
              submenu: [
                {
                  label: t.floatingHud,
                  click: sendToRenderer("menu:setInfoBarMode", "hud"),
                },
                {
                  label: t.statusBar,
                  click: sendToRenderer("menu:setInfoBarMode", "status"),
                },
              ],
            },
          ],
        },
        {
          label: t.theme,
          submenu: [
            {
              label: t.themeLight,
              click: sendToRenderer("menu:setTheme", "light"),
            },
            {
              label: t.themeDark,
              click: sendToRenderer("menu:setTheme", "dark"),
            },
          ],
        },
        {
          label: t.languageMode,
          submenu: [
            {
              label: t.plainText,
              click: sendToRenderer("menu:setLanguage", "plaintext"),
            },
            {
              label: t.markdown,
              click: sendToRenderer("menu:setLanguage", "markdown"),
            },
          ],
        },
        {
          label: t.uiLanguage,
          submenu: [
            {
              label: t.korean,
              click: sendToRenderer("menu:setUILanguage", "ko"),
            },
            {
              label: t.english,
              click: sendToRenderer("menu:setUILanguage", "en"),
            },
          ],
        },
        { type: "separator" },
        {
          label: t.zoom,
          submenu: [
            {
              label: t.zoomIn,
              accelerator: "CmdOrCtrl+Plus",
              click: sendToRenderer("menu:fontSizeUp"),
            },
            {
              label: t.zoomOut,
              accelerator: "CmdOrCtrl+-",
              click: sendToRenderer("menu:fontSizeDown"),
            },
            {
              label: t.zoomReset,
              accelerator: "CmdOrCtrl+0",
              click: sendToRenderer("menu:fontSizeReset"),
            },
          ],
        },
        { type: "separator" },
        ...(!isMac
          ? ([
              { label: t.toggleFullScreen, role: "togglefullscreen" as const },
            ] as Electron.MenuItemConstructorOptions[])
          : []),
      ],
    },
    {
      id: "go",
      label: t.go,
      submenu: [
        {
          label: t.gotoLine,
          accelerator: "CmdOrCtrl+G",
          click: sendToRenderer("menu:gotoLine"),
        },
      ],
    },
    {
      id: "help",
      label: t.help,
      submenu: [
        {
          label: t.devTools,
          accelerator: "CmdOrCtrl+Alt+I",
          click: () =>
            BrowserWindow.getFocusedWindow()?.webContents.toggleDevTools(),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // 중복 등록 방지
  if (!ipcMain.listenerCount("menu:popup")) {
    ipcMain.on("menu:popup", (event, menuId: string, x: number, y: number) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return;

      const appMenu = Menu.getApplicationMenu();
      if (!appMenu) return;

      const menuItem = appMenu.getMenuItemById(menuId);
      if (menuItem && menuItem.submenu) {
        menuItem.submenu.popup({
          window,
          x,
          y,
          callback: () => {
            if (!window.isDestroyed()) {
              window.webContents.send("menu:closed", menuId);
            }
          },
        });
      }
    });
  }
}

function buildRecentFilesSubmenu(
  t: Record<string, string>,
): Electron.MenuItemConstructorOptions[] {
  const recentFiles: string[] =
    (store.get("general.recentFiles" as keyof import("../types/settings").Settings) as unknown as string[]) ?? [];

  if (recentFiles.length === 0) {
    return [{ label: t.noRecentFiles, enabled: false }];
  }

  return [
    ...recentFiles.map((fp) => ({
      label: fp.split(/[\\/]/).pop() ?? fp,
      click: sendToRenderer("menu:openRecent", fp),
    })),
    { type: "separator" as const },
    { label: t.clearRecentFiles, click: sendToRenderer("menu:clearRecentFiles") },
  ];
}

function sendToRenderer(channel: string, ...args: unknown[]) {
  return (): void => {
    BrowserWindow.getFocusedWindow()?.webContents.send(channel, ...args);
  };
}
