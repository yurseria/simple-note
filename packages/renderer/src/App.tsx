import { useEffect, useState, useCallback, useRef } from "react";
import { TitleBar } from "./components/TitleBar/TitleBar";
import { TabBar } from "./components/TabBar/TabBar";
import { Editor } from "./components/Editor/Editor";
import { MarkdownPreview } from "./components/Editor/markdownPreview/MarkdownPreview";
import { InfoBar } from "./components/InfoBar/InfoBar";
import { useTabStore, inferLanguage } from "./store/tabStore";
import { useSettingsStore } from "./store/settingsStore";
import { useFile } from "./hooks/useFile";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useExternalFileSync } from "./hooks/useExternalFileSync";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import { api } from "./platform";
import { useTranslation } from "./i18n";
import type { LanguageMode } from "./types/tab";
import type { UILanguage } from "./types/settings";
import "./App.css";

export function App(): JSX.Element {
  const {
    tabs,
    activeId,
    activeTab,
    addTab,
    updateContent,
    setLanguage,
    togglePreview,
  } = useTabStore();
  const { settings, loaded, load } = useSettingsStore();
  const { openFile, saveFile, saveFileAs, maybeCloseTab } = useFile();
  const t = useTranslation();

  const [gotoLineVisible, setGotoLineVisible] = useState(false);
  const [gotoLineValue, setGotoLineValue] = useState("");
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [previewTopLine, setPreviewTopLine] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const tab = activeTab();

  useExternalFileSync();

  useEffect(() => {
    load();
  }, [load]);

  const handleNewTab = useCallback(() => addTab(), [addTab]);

  const dispatchMenuAction = useCallback((action: string, payload?: string) => {
    switch (action) {
      case "menu:newTab": addTab(); break;
      case "menu:open": openFile(); break;
      case "menu:openRecent":
        if (payload) openFile(payload); break;
      case "menu:clearRecentFiles":
        useSettingsStore.getState().update("general", {
          ...useSettingsStore.getState().settings.general,
          recentFiles: [],
        }); break;
      case "menu:save": saveFile(); break;
      case "menu:saveAs": saveFileAs(); break;
      case "menu:closeTab": {
        const t = useTabStore.getState().activeTab();
        if (t) maybeCloseTab(t.id);
        break;
      }
      case "menu:gotoLine": setGotoLineVisible(true); break;
      case "menu:toggleMarkdownPreview": {
        const id = useTabStore.getState().activeId;
        useTabStore.getState().togglePreview(id);
        break;
      }
      case "menu:selectNextOccurrence":
        window.dispatchEvent(new CustomEvent("editor:selectNextOccurrence")); break;
      case "menu:selectAllOccurrences":
        window.dispatchEvent(new CustomEvent("editor:selectAllOccurrences")); break;
      case "menu:find":
        window.dispatchEvent(new CustomEvent("editor:openFind")); break;
      case "menu:replace":
        window.dispatchEvent(new CustomEvent("editor:openReplace")); break;
      case "menu:toggleLineNumbers": {
        const { updateEditor, settings: s } = useSettingsStore.getState();
        updateEditor({ showLineNumbers: !s.editor.showLineNumbers });
        break;
      }
      case "menu:setLanguage":
        if (payload) {
          const { activeId: aid, setLanguage: sl } = useTabStore.getState();
          sl(aid, payload as LanguageMode, true);
        }
        break;
      case "menu:setUILanguage":
        if (payload) useSettingsStore.getState().update("language", payload as UILanguage);
        break;
      case "menu:fontSizeUp": {
        const { updateEditor: ue, settings: se } = useSettingsStore.getState();
        ue({ fontSize: se.editor.fontSize + 1 });
        break;
      }
      case "menu:fontSizeDown": {
        const { updateEditor: ue2, settings: se2 } = useSettingsStore.getState();
        ue2({ fontSize: Math.max(8, se2.editor.fontSize - 1) });
        break;
      }
      case "menu:fontSizeReset":
        useSettingsStore.getState().updateEditor({ fontSize: 14 }); break;
      case "menu:setTheme":
        if (payload) useSettingsStore.getState().updateEditor({ theme: payload as "light" | "dark" });
        break;
      case "menu:setInfoBarMode":
        if (payload) useSettingsStore.getState().updateEditor({ infoBarMode: payload as "hud" | "status" });
        break;
      case "menu:toggleZenMode":
        setZenMode(z => !z); break;
      case "menu:commandPalette":
        setCommandPaletteOpen(o => !o); break;
      case "menu:checkForUpdates":
        api.menu.dispatch("checkForUpdates"); break;
    }
  }, [addTab, openFile, saveFile, saveFileAs, maybeCloseTab]);

  useEffect(() => {
    return api.menu.subscribe(dispatchMenuAction)
  }, [dispatchMenuAction])

  useEffect(() => {
    const menuEvents = [
      "menu:newTab", "menu:open", "menu:save", "menu:saveAs", "menu:closeTab",
      "menu:gotoLine", "menu:toggleMarkdownPreview", "menu:find", "menu:replace",
      "menu:toggleLineNumbers", "menu:setLanguage", "menu:setUILanguage",
      "menu:fontSizeUp", "menu:fontSizeDown", "menu:fontSizeReset",
      "menu:setTheme", "menu:setInfoBarMode", "menu:selectNextOccurrence", "menu:selectAllOccurrences",
      "menu:openRecent", "menu:clearRecentFiles", "menu:toggleZenMode", "menu:commandPalette"
    ]
    const handler = (e: Event) => {
      const ce = e as CustomEvent
      const detail = ce.detail
      const payload = Array.isArray(detail) ? detail[0] : detail
      dispatchMenuAction(e.type, typeof payload === "string" ? payload : undefined)
    }
    for (const ev of menuEvents) window.addEventListener(ev, handler)
    return () => {
      for (const ev of menuEvents) window.removeEventListener(ev, handler)
    }
  }, [dispatchMenuAction])

  // 드래그 앤 드롭 파일 열기
  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
    }
    function handleDrop(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        // file.path는 Electron에서 사용 가능
        const filePath = (file as unknown as { path?: string }).path;
        if (filePath) openFile(filePath);
      }
    }
    // Tauri drag-drop 이벤트
    function handleTauriDrop(e: Event) {
      const filePath = (e as CustomEvent<string>).detail;
      if (filePath) openFile(filePath);
    }
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);
    window.addEventListener("tauri:file-drop", handleTauriDrop);
    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
      window.removeEventListener("tauri:file-drop", handleTauriDrop);
    };
  }, [openFile]);

  // Zen 모드에서 Escape로 해제
  useEffect(() => {
    if (!zenMode) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setZenMode(false);
      }
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [zenMode]);

  // 토스트 메시지 이벤트 수신
  useEffect(() => {
    function handleToast(e: Event) {
      const msg = (e as CustomEvent<string>).detail;
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
    }
    window.addEventListener("editor:toast", handleToast);
    return () => window.removeEventListener("editor:toast", handleToast);
  }, []);

  useKeyboardShortcuts({
    onNewTab: handleNewTab,
    onOpen: () => openFile(),
    onSave: saveFile,
    onSaveAs: saveFileAs,
    onCloseTab: () => {
      const t = useTabStore.getState().activeTab();
      if (t) maybeCloseTab(t.id);
    },
    onGotoLine: () => setGotoLineVisible(true),
    onToggleMarkdownPreview: () => {
      const id = useTabStore.getState().activeId;
      useTabStore.getState().togglePreview(id);
    },
    onFind: () => window.dispatchEvent(new CustomEvent("editor:openFind")),
    onReplace: () => window.dispatchEvent(new CustomEvent("editor:openReplace")),
    onCommandPalette: () => setCommandPaletteOpen(true),
    onToggleZenMode: () => dispatchMenuAction("menu:toggleZenMode"),
  });

  function handleDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const container = splitContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const ratio = Math.max(
        0.2,
        Math.min(0.8, (ev.clientX - rect.left) / rect.width),
      );
      setSplitRatio(ratio);
    };

    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleLanguageToggle() {
    if (!tab) return;
    const originalLanguage = inferLanguage(tab.filePath);

    let next: LanguageMode;
    if (originalLanguage === "plaintext" || originalLanguage === "markdown") {
      next = tab.language === "markdown" ? "plaintext" : "markdown";
    } else {
      next = tab.language === originalLanguage ? "plaintext" : originalLanguage;
    }

    setLanguage(tab.id, next, true);
  }

  function handleGotoLine() {
    const line = parseInt(gotoLineValue, 10);
    setGotoLineVisible(false);
    setGotoLineValue("");
    if (!isNaN(line)) {
      window.dispatchEvent(
        new CustomEvent("editor:gotoLine", { detail: line }),
      );
    }
  }

  if (!loaded) return <div className="app app--loading" />;

  const isMarkdown = tab?.language === "markdown";
  const showPreview = tab?.showPreview ?? false;

  void tabs;
  void activeId;
  void togglePreview;

  return (
    <div className={`app${zenMode ? ' app--zen' : ''}`} data-theme={settings.editor.theme}>
      {!zenMode ? (
        <>
          <TitleBar
            title={tab?.fileName ?? "Note"}
            isEdited={tab?.isDirty ?? false}
          />
          <TabBar onNewTab={handleNewTab} onCloseTab={maybeCloseTab} />
        </>
      ) : (
        <div
          className="zen-drag-region"
          {...(api.runtime === 'tauri' ? { 'data-tauri-drag-region': true } as Record<string, unknown> : {})}
        >
          <span className="zen-drag-region__hint">{t.view.zenMode} — Esc</span>
        </div>
      )}

      <div
        className={`app__body${settings.editor.infoBarMode === "hud" ? " app__body--hud" : ""}`}
      >
        {tab && (
          <>
            <div
              ref={splitContainerRef}
              className={`app__editor-pane ${showPreview && isMarkdown ? "app__editor-pane--split" : ""}`}
              style={
                showPreview && isMarkdown
                  ? ({
                      "--split-left": `${splitRatio * 100}%`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <Editor
                tabId={tab.id}
                content={tab.content}
                language={tab.language}
                filePath={tab.filePath}
                settings={settings.editor}
                onChange={(c) => updateContent(tab.id, c)}
                onTopLine={
                  isMarkdown && showPreview
                    ? setPreviewTopLine
                    : undefined
                }
              />
              {isMarkdown && showPreview && (
                <>
                  <div
                    className="split-divider"
                    onMouseDown={handleDividerMouseDown}
                  />
                  <MarkdownPreview
                    content={tab.content}
                    topLine={previewTopLine}
                    theme={settings.editor.theme}
                    basePath={tab.filePath}
                    convertFileSrc={api.convertFileSrc}
                  />
                </>
              )}
            </div>
            {!zenMode && settings.editor.infoBarMode !== "none" && (
              <InfoBar
                content={tab.content}
                encoding={tab.encoding}
                mode={settings.editor.infoBarMode}
                language={tab.language}
                countWhitespaces={settings.editor.countWhitespacesInChars}
                onLanguageClick={handleLanguageToggle}
              />
            )}
          </>
        )}
      </div>

      {gotoLineVisible && (
        <div className="goto-overlay" onClick={() => setGotoLineVisible(false)}>
          <div className="goto-dialog" onClick={(e) => e.stopPropagation()}>
            <label className="goto-dialog__label">
              {t.dialog.gotoLineLabel}
            </label>
            <input
              className="goto-dialog__input"
              type="number"
              min={1}
              autoFocus
              value={gotoLineValue}
              onChange={(e) => setGotoLineValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleGotoLine();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setGotoLineVisible(false);
                }
              }}
            />
            <div className="goto-dialog__actions">
              <button
                className="goto-dialog__btn goto-dialog__btn--primary"
                onClick={handleGotoLine}
              >
                {t.dialog.gotoBtn}
              </button>
              <button
                className="goto-dialog__btn"
                onClick={() => setGotoLineVisible(false)}
              >
                {t.dialog.cancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {commandPaletteOpen && (
        <CommandPalette
          onClose={() => setCommandPaletteOpen(false)}
          onAction={dispatchMenuAction}
        />
      )}

      {toast && (
        <div className="toast">{toast}</div>
      )}
    </div>
  );
}
