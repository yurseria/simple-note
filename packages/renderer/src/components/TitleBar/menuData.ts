import type { Translations } from "../../i18n/types";

export type MenuItem =
  | { type: "separator" }
  | {
      type?: undefined;
      label: string;
      accelerator?: string;
      action?: string;
      actionArgs?: unknown[];
      role?: string;
      submenu?: MenuItem[];
    };

export interface MenuDefinition {
  id: string;
  label: string;
  items: MenuItem[];
}

export function getAppMenuData(t: Translations, recentFiles: string[] = []): MenuDefinition[] {
  const recentSubmenu: MenuItem[] = recentFiles.length > 0
    ? [
        ...recentFiles.map((fp) => ({
          label: fp.split(/[\\/]/).pop() ?? fp,
          action: "menu:openRecent",
          actionArgs: [fp] as unknown[],
        })),
        { type: "separator" as const },
        { label: t.file.clearRecentFiles, action: "menu:clearRecentFiles" },
      ]
    : [{ label: t.file.noRecentFiles }]

  return [
    {
      id: "file",
      label: t.menu.file,
      items: [
        { label: t.file.newTab, accelerator: "Ctrl+T", action: "menu:newTab" },
        { label: t.file.open, accelerator: "Ctrl+O", action: "menu:open" },
        { label: t.file.recentFiles, submenu: recentSubmenu },
        { type: "separator" },
        { label: t.file.save, accelerator: "Ctrl+S", action: "menu:save" },
        {
          label: t.file.saveAs,
          accelerator: "Ctrl+Shift+S",
          action: "menu:saveAs",
        },
        { type: "separator" },
        {
          label: t.file.closeTab,
          accelerator: "Ctrl+W",
          action: "menu:closeTab",
        },
        { type: "separator" },
        { label: t.file.quit, role: "quit" },
      ],
    },
    {
      id: "edit",
      label: t.menu.edit,
      items: [
        { label: t.edit.undo, accelerator: "Ctrl+Z", role: "undo" },
        { label: t.edit.redo, accelerator: "Ctrl+Shift+Z", role: "redo" },
        { type: "separator" },
        { label: t.edit.cut, accelerator: "Ctrl+X", role: "cut" },
        { label: t.edit.copy, accelerator: "Ctrl+C", role: "copy" },
        { label: t.edit.paste, accelerator: "Ctrl+V", role: "paste" },
        { type: "separator" },
        {
          label: t.edit.selectNextOccurrence,
          accelerator: "Ctrl+D",
          action: "menu:selectNextOccurrence",
        },
        {
          label: t.edit.selectAllOccurrences,
          accelerator: "Ctrl+Shift+L",
          action: "menu:selectAllOccurrences",
        },
        { type: "separator" },
        { label: t.edit.selectAll, accelerator: "Ctrl+A", role: "selectAll" },
        { type: "separator" },
        { label: t.edit.find, accelerator: "Ctrl+F", action: "menu:find" },
        {
          label: t.edit.replace,
          accelerator: "Ctrl+H",
          action: "menu:replace",
        },
      ],
    },
    {
      id: "view",
      label: t.menu.view,
      items: [
        {
          label: t.view.appearance,
          submenu: [
            {
              label: t.view.toggleLineNumbers,
              accelerator: "Ctrl+Shift+L",
              action: "menu:toggleLineNumbers",
            },
            {
              label: t.view.infoBarStyle,
              submenu: [
                {
                  label: t.view.floatingHud,
                  action: "menu:setInfoBarMode",
                  actionArgs: ["hud"],
                },
                {
                  label: t.view.statusBar,
                  action: "menu:setInfoBarMode",
                  actionArgs: ["status"],
                },
              ],
            },
          ],
        },
        {
          label: t.view.theme,
          submenu: [
            {
              label: t.view.themeLight,
              action: "menu:setTheme",
              actionArgs: ["light"],
            },
            {
              label: t.view.themeDark,
              action: "menu:setTheme",
              actionArgs: ["dark"],
            },
          ],
        },
        {
          label: t.view.languageMode,
          submenu: [
            {
              label: t.view.plainText,
              action: "menu:setLanguage",
              actionArgs: ["plaintext"],
            },
            {
              label: t.view.markdown,
              action: "menu:setLanguage",
              actionArgs: ["markdown"],
            },
          ],
        },
        {
          label: t.view.uiLanguage,
          submenu: [
            {
              label: t.view.korean,
              action: "menu:setUILanguage",
              actionArgs: ["ko"],
            },
            {
              label: t.view.english,
              action: "menu:setUILanguage",
              actionArgs: ["en"],
            },
          ],
        },
        { type: "separator" },
        {
          label: t.view.zoom,
          submenu: [
            {
              label: t.view.zoomIn,
              accelerator: "Ctrl+Plus",
              action: "menu:fontSizeUp",
            },
            {
              label: t.view.zoomOut,
              accelerator: "Ctrl+-",
              action: "menu:fontSizeDown",
            },
            {
              label: t.view.zoomReset,
              accelerator: "Ctrl+0",
              action: "menu:fontSizeReset",
            },
          ],
        },
        { type: "separator" },
        {
          label: t.view.toggleFullScreen,
          role: "togglefullscreen",
          accelerator: "F11",
        },
      ],
    },
    {
      id: "go",
      label: t.menu.go,
      items: [
        {
          label: t.go.gotoLine,
          accelerator: "Ctrl+G",
          action: "menu:gotoLine",
        },
      ],
    },
    {
      id: "help",
      label: t.menu.help,
      items: [
        { label: t.help.about, role: "about" },
        { type: "separator" },
        {
          label: t.help.devTools,
          accelerator: "Ctrl+Alt+I",
          role: "toggleDevTools",
        },
      ],
    },
  ];
}
