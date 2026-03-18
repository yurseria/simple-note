import { useEffect, useState, useCallback, useRef } from "react";
import { TitleBar } from "./components/TitleBar/TitleBar";
import { TabBar } from "./components/TabBar/TabBar";
import { Editor } from "./components/Editor/Editor";
import { MarkdownPreview } from "./components/Editor/markdownPreview/MarkdownPreview";
import { InfoBar } from "./components/InfoBar/InfoBar";
import { useTabStore, inferLanguage } from "./store/tabStore";
import { useSettingsStore } from "./store/settingsStore";
import { useFile } from "./hooks/useFile";
import { useMenuEvents } from "./hooks/useMenuEvents";
import type { LanguageMode } from "../../types/tab";
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

  const [gotoLineVisible, setGotoLineVisible] = useState(false);
  const [gotoLineValue, setGotoLineValue] = useState("");
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [scrollToBottom, setScrollToBottom] = useState(0);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const tab = activeTab();

  useEffect(() => {
    load();
  }, [load]);

  const handleNewTab = useCallback(() => addTab(), [addTab]);
  const handleTogglePreview = useCallback(() => {
    const id = useTabStore.getState().activeId;
    useTabStore.getState().togglePreview(id);
  }, []);

  useMenuEvents({
    onNewTab: handleNewTab,
    onOpen: () => openFile(),
    onSave: saveFile,
    onSaveAs: saveFileAs,
    onCloseTab: () => {
      const t = useTabStore.getState().activeTab();
      if (t) maybeCloseTab(t.id);
    },
    onGotoLine: () => setGotoLineVisible(true),
    onToggleMarkdownPreview: handleTogglePreview,
    onFind: () => window.dispatchEvent(new CustomEvent("editor:openFind")),
    onReplace: () =>
      window.dispatchEvent(new CustomEvent("editor:openReplace")),
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

  // tabs 참조를 억제하기 위한 lint 무시 (activeId deps로 tab 파생)
  void tabs;

  return (
    <div className="app" data-theme={settings.editor.theme}>
      <TitleBar
        title={tab?.fileName ?? "Note"}
        isEdited={tab?.isDirty ?? false}
      />
      <TabBar onNewTab={handleNewTab} onCloseTab={maybeCloseTab} />

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
                settings={settings.editor}
                onChange={(c) => updateContent(tab.id, c)}
                onCursorAtBottom={
                  isMarkdown && showPreview
                    ? () => setScrollToBottom((n) => n + 1)
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
                    scrollToBottom={scrollToBottom}
                  />
                </>
              )}
            </div>
            {settings.editor.infoBarMode !== "none" && (
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
            <label className="goto-dialog__label">줄로 이동:</label>
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
                이동
              </button>
              <button
                className="goto-dialog__btn"
                onClick={() => setGotoLineVisible(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
