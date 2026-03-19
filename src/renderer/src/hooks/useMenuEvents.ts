import { useEffect, useRef } from "react";
import { useTabStore } from "../store/tabStore";
import { useSettingsStore } from "../store/settingsStore";
import type { LanguageMode } from "../../../types/tab";
import type { UILanguage } from "../../../types/settings";

interface Options {
  onNewTab: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onCloseTab: () => void;
  onGotoLine: () => void;
  onToggleMarkdownPreview: () => void;
  onFind: () => void;
  onReplace: () => void;
}

export function useMenuEvents(opts: Options): void {
  // opts를 ref로 보관해 deps 배열에서 제외 — 불필요한 이벤트 재등록 방지
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const offs = [
      window.api.menu.on("menu:newTab", () => optsRef.current.onNewTab()),
      window.api.menu.on("menu:open", () => optsRef.current.onOpen()),
      window.api.menu.on("menu:save", () => optsRef.current.onSave()),
      window.api.menu.on("menu:saveAs", () => optsRef.current.onSaveAs()),
      window.api.menu.on("menu:closeTab", () => optsRef.current.onCloseTab()),
      window.api.menu.on("menu:gotoLine", () => optsRef.current.onGotoLine()),
      window.api.menu.on("menu:toggleMarkdownPreview", () =>
        optsRef.current.onToggleMarkdownPreview(),
      ),
      window.api.menu.on("menu:find", () => optsRef.current.onFind()),
      window.api.menu.on("menu:replace", () => optsRef.current.onReplace()),
      window.api.menu.on("menu:toggleLineNumbers", () => {
        const { updateEditor, settings } = useSettingsStore.getState();
        updateEditor({ showLineNumbers: !settings.editor.showLineNumbers });
      }),
      window.api.menu.on("menu:setLanguage", (lang: unknown) => {
        const { activeId, setLanguage } = useTabStore.getState();
        setLanguage(activeId, lang as LanguageMode, true);
      }),
      window.api.menu.on("menu:setUILanguage", (lang: unknown) => {
        useSettingsStore.getState().update("language", lang as UILanguage);
      }),
      window.api.menu.on("menu:fontSizeUp", () => {
        const { updateEditor, settings } = useSettingsStore.getState();
        updateEditor({ fontSize: settings.editor.fontSize + 1 });
      }),
      window.api.menu.on("menu:fontSizeDown", () => {
        const { updateEditor, settings } = useSettingsStore.getState();
        updateEditor({ fontSize: Math.max(8, settings.editor.fontSize - 1) });
      }),
      window.api.menu.on("menu:fontSizeReset", () => {
        useSettingsStore.getState().updateEditor({ fontSize: 14 });
      }),
      window.api.menu.on("menu:setTheme", (theme: unknown) => {
        useSettingsStore
          .getState()
          .updateEditor({ theme: theme as "light" | "dark" });
      }),
      window.api.menu.on("menu:setInfoBarMode", (mode: unknown) => {
        useSettingsStore
          .getState()
          .updateEditor({ infoBarMode: mode as "hud" | "status" });
      }),
    ];
    return () => offs.forEach((off) => off());
    // 마운트 시 1회만 등록
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
