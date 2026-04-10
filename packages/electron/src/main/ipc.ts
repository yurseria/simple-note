import { ipcMain, dialog, BrowserWindow, nativeTheme, app, clipboard } from "electron";
import * as path from "path";
import * as fs from "fs";
import { readFileWithEncoding, writeFileWithEncoding } from "./fileManager";
import { store } from "./store";
import { logger } from "./logger";
import { buildMenu } from "./menu";
import type { Settings, UILanguage } from "../types/settings";

const TEXT_FILTERS = [
  { name: "Text Files", extensions: ["txt", "md", "markdown", "log", "csv"] },
  { name: "All Files", extensions: ["*"] },
];

// ── 메인 프로세스 다이얼로그용 번역 ───────────────────────────────────────
const DIALOG_T: Record<
  UILanguage,
  {
    confirmSave: (fileName: string) => string;
    save: string;
    dontSave: string;
    cancel: string;
    aboutTitle: string;
    version: string;
    confirm: string;
  }
> = {
  ko: {
    confirmSave: (fileName) => `"${fileName}"의 변경사항을 저장하겠습니까?`,
    save: "저장",
    dontSave: "저장하지 않고 닫기",
    cancel: "취소",
    aboutTitle: "정보",
    version: "버전",
    confirm: "확인",
  },
  en: {
    confirmSave: (fileName) => `Do you want to save changes to "${fileName}"?`,
    save: "Save",
    dontSave: "Close Without Saving",
    cancel: "Cancel",
    aboutTitle: "About",
    version: "Version",
    confirm: "OK",
  },
};

function getLanguage(): UILanguage {
  return (
    (store.get("language" as keyof Settings) as UILanguage | undefined) ?? "en"
  );
}

export function registerIpcHandlers(): void {
  ipcMain.handle("file:open", async (_, filePath?: string) => {
    let targetPath = filePath;
    if (!targetPath) {
      const win = BrowserWindow.getFocusedWindow();
      const result = await dialog.showOpenDialog(win!, {
        properties: ["openFile"],
        filters: TEXT_FILTERS,
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      targetPath = result.filePaths[0];
    }
    try {
      const data = await readFileWithEncoding(targetPath);
      logger.info("file:open", {
        path: targetPath,
        encoding: data.encoding,
        language: data.language,
      });
      return { filePath: targetPath, ...data };
    } catch (err) {
      logger.error("file:open failed", {
        path: targetPath,
        error: String(err),
      });
      throw err;
    }
  });

  ipcMain.handle("file:read", async (_, filePath: string) => {
    try {
      const data = await readFileWithEncoding(filePath);
      return data;
    } catch (err) {
      logger.error("file:read failed", { path: filePath, error: String(err) });
      throw err;
    }
  });

  ipcMain.handle(
    "file:save",
    async (_, filePath: string, content: string, encoding: string) => {
      try {
        await writeFileWithEncoding(filePath, content, encoding);
        logger.info("file:save", {
          path: filePath,
          encoding,
          bytes: Buffer.byteLength(content),
        });
        return true;
      } catch (err) {
        logger.error("file:save failed", {
          path: filePath,
          error: String(err),
        });
        throw err;
      }
    },
  );

  ipcMain.handle(
    "file:saveAs",
    async (_, content: string, encoding: string, defaultPath?: string) => {
      const win = BrowserWindow.getFocusedWindow();
      const result = await dialog.showSaveDialog(win!, {
        defaultPath: defaultPath ?? "Untitled.txt",
        filters: TEXT_FILTERS,
      });
      if (result.canceled || !result.filePath) return null;
      try {
        await writeFileWithEncoding(result.filePath, content, encoding);
        logger.info("file:saveAs", {
          path: result.filePath,
          encoding,
          bytes: Buffer.byteLength(content),
        });
        return result.filePath;
      } catch (err) {
        logger.error("file:saveAs failed", {
          path: result.filePath,
          error: String(err),
        });
        throw err;
      }
    },
  );

  // file:saveClipboardImage — 클립보드 이미지를 dirPath/images/에 PNG로 저장
  ipcMain.handle("file:saveClipboardImage", async (_, dirPath: string) => {
    const img = clipboard.readImage();
    if (img.isEmpty()) return null;

    const imagesDir = path.join(dirPath, "images");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const now = new Date();
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join("");
    const fileName = `paste-${ts}.png`;
    const filePath = path.join(imagesDir, fileName);

    try {
      fs.writeFileSync(filePath, img.toPNG());
      logger.info("file:saveClipboardImage", { path: filePath });
      return `./images/${fileName}`;
    } catch (err) {
      logger.error("file:saveClipboardImage failed", { error: String(err) });
      throw err;
    }
  });

  // settings:get — 첫 실행 시 OS 로케일로 UI 언어 자동 설정
  ipcMain.handle("settings:get", () => {
    const raw = store.store as Settings & { language?: UILanguage };

    if (!raw.language) {
      const locale = app.getLocale(); // e.g. 'ko', 'ko-KR', 'en-US'
      const detected: UILanguage = locale.toLowerCase().startsWith("ko")
        ? "ko"
        : "en";
      store.set(
        "language" as keyof Settings,
        detected as Settings[keyof Settings],
      );
      logger.info("settings:get — language auto-detected", {
        locale,
        detected,
      });
      return { ...raw, language: detected };
    }

    return raw;
  });

  ipcMain.handle(
    "settings:set",
    <K extends keyof Settings>(
      _: Electron.IpcMainInvokeEvent,
      key: K,
      value: Settings[K],
    ) => {
      store.set(key, value);
      logger.info("settings:set", { key });

      if (key === "language") {
        buildMenu(value as UILanguage);
      }

      // 최근 파일 등 general 설정 변경 시 메뉴 재빌드 (최근 파일 서브메뉴 갱신)
      if (key === "general") {
        const lang = (store.get("language") as UILanguage) ?? "en";
        buildMenu(lang);
      }

      if (key === "editor") {
        const editorSettings = value as Settings["editor"];
        const isDark = editorSettings.theme === "dark";
        nativeTheme.themeSource = isDark ? "dark" : "light";

        const bgColor = isDark ? "#282c34" : "#fafafa";
        const symbolColor = isDark ? "#abb2bf" : "#282c34";

        BrowserWindow.getAllWindows().forEach((win) => {
          if (process.platform === "win32") {
            win.setTitleBarOverlay({ color: bgColor, symbolColor });
          }
          win.setBackgroundColor(bgColor);
        });
      }

      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send("settings:changed", key, value);
      });
    },
  );

  ipcMain.handle("dialog:confirmClose", async (_, fileName: string) => {
    const win = BrowserWindow.getFocusedWindow();
    const lang = getLanguage();
    const dt = DIALOG_T[lang];
    const result = await dialog.showMessageBox(win!, {
      type: "warning",
      message: dt.confirmSave(fileName),
      buttons: [dt.save, dt.dontSave, dt.cancel],
      defaultId: 0,
      cancelId: 2,
    });
    return result.response; // 0: save, 1: close without saving, 2: cancel
  });

  ipcMain.on("menu:trigger", (e, channel: string, ...args: unknown[]) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win) {
      win.webContents.send(channel, ...args);
    }
  });

  ipcMain.on("menu:role", (e, role: string) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;
    if (role === "togglefullscreen") {
      win.setFullScreen(!win.isFullScreen());
    } else if (role === "toggleDevTools") {
      win.webContents.toggleDevTools();
    } else if (role === "quit") {
      import("electron").then(({ app }) => app.quit());
    } else if (role === "about") {
      import("electron").then(({ app, dialog }) => {
        const lang = getLanguage();
        const dt = DIALOG_T[lang];
        dialog.showMessageBox(win, {
          type: "info",
          title: dt.aboutTitle,
          message: app.name,
          detail: `${dt.version}: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}\nV8: ${process.versions.v8}\nOS: ${process.type} ${process.arch}`,
          buttons: [dt.confirm],
        });
      });
    } else {
      if (
        typeof (win.webContents as unknown as Record<string, unknown>)[role] ===
        "function"
      ) {
        (win.webContents as unknown as Record<string, () => void>)[role]();
      }
    }
  });
}
