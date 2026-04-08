import { useEffect, useRef, useState } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState, Transaction } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { selectAll, undo, redo } from "@codemirror/commands";
import { selectNextOccurrence, selectSelectionMatches } from "@codemirror/search";
import {
  createCompartments,
  buildBaseExtensions,
  buildLanguageExt,
  buildLineNumbersExt,
  buildTabExt,
  buildThemeExt,
  loadLanguageExtension,
  type EditorCompartments,
} from "./extensions";
import { FindReplace } from "./FindReplace/FindReplace";
import { MarkdownToolbar } from "./MarkdownToolbar/MarkdownToolbar";
import { api } from "../../platform";
import { csvTsvToMarkdownTable } from "./markdownActions";
import { useTranslation } from "../../i18n";
import type { LanguageMode } from "../../types/tab";
import type { Settings } from "../../types/settings";
import "./Editor.css";

interface Props {
  tabId: string;
  content: string;
  language: LanguageMode;
  filePath: string | null;
  settings: Settings["editor"];
  onChange: (content: string) => void;
  onCursorAtBottom?: () => void;
}

export function Editor({
  tabId,
  content,
  language,
  filePath,
  settings,
  onChange,
  onCursorAtBottom,
}: Props): JSX.Element {
  const t = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const compartmentsRef = useRef<EditorCompartments | null>(null);
  // onChange / onCursorAtBottom ref로 stale closure 방지
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorAtBottomRef = useRef(onCursorAtBottom);
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;
  onCursorAtBottomRef.current = onCursorAtBottom;
  // 마지막으로 에디터가 스스로 보고한 content — 외부 sync 스킵 판별용
  const lastEditorContentRef = useRef(content);

  // FindReplace 패널 상태
  const [cmView, setCmView] = useState<EditorView | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findMode, setFindMode] = useState<"find" | "replace">("find");

  // 탭 또는 언어 변경 시 에디터 재생성
  useEffect(() => {
    if (!containerRef.current) return;

    const compartments = createCompartments();
    compartmentsRef.current = compartments;

    lastEditorContentRef.current = content;

    const stableOnChange = (c: string) => {
      lastEditorContentRef.current = c;
      onChangeRef.current(c);
    };

    const extensions = [
      settings.theme === "dark" ? oneDark : [],
      ...buildBaseExtensions(stableOnChange, compartments, settings, language),
      // 커서가 마지막 줄에 있고 내용이 바뀌면 onCursorAtBottom 호출
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        if (update.transactions.some((tr) => tr.annotation(Transaction.remote)))
          return;
        const { state } = update;
        const cursorLine = state.doc.lineAt(state.selection.main.head).number;
        if (cursorLine === state.doc.lines) {
          onCursorAtBottomRef.current?.();
        }
      }),
    ];

    const state = EditorState.create({ doc: content, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    setCmView(view);

    // 동적 언어 로딩 (마크다운은 빌드시 기본 포함됨)
    if (language !== "markdown" && language !== "plaintext") {
      loadLanguageExtension(language)
        .then((ext) => {
          if (ext && viewRef.current === view) {
            view.dispatch({ effects: compartments.language.reconfigure(ext) });
          }
        })
        .catch(console.error);
    }

    if ((import.meta as unknown as { env: { DEV: boolean } }).env.DEV) {
      (window as unknown as Record<string, unknown>).__cmView = view;
    }

    return () => {
      view.destroy();
      viewRef.current = null;
      compartmentsRef.current = null;
      setCmView(null);
      setFindOpen(false);
    };
    // content는 의도적으로 제외 — 탭/언어 변경 시만 재생성
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId, language, settings.theme]);

  // 외부 content 변경 동기화 (파일 열기 등)
  // 에디터가 스스로 보고한 변경은 skip — IME composition 순환 업데이트 방지
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    // 에디터 자체 변경으로 발생한 content prop 업데이트이면 재dispatch 불필요
    if (content === lastEditorContentRef.current) return;
    // IME composition 진행 중에는 dispatch하지 않음 (한글 겹침 방지)
    if (view.composing) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      lastEditorContentRef.current = content;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
        annotations: Transaction.remote.of(true),
      });
    }
  }, [content]);

  // 줄 번호 토글 — Compartment 재구성
  useEffect(() => {
    const view = viewRef.current;
    const cs = compartmentsRef.current;
    if (!view || !cs) return;
    view.dispatch({
      effects: cs.lineNumbers.reconfigure(
        buildLineNumbersExt(settings.showLineNumbers),
      ),
    });
  }, [settings.showLineNumbers]);

  // 탭 설정 변경 — Compartment 재구성
  useEffect(() => {
    const view = viewRef.current;
    const cs = compartmentsRef.current;
    if (!view || !cs) return;
    view.dispatch({
      effects: cs.tabSize.reconfigure(
        buildTabExt(settings.tabSize, settings.useSpacesForTabs),
      ),
    });
  }, [settings.tabSize, settings.useSpacesForTabs]);

  // 폰트/크기 변경 — Compartment 재구성
  useEffect(() => {
    const view = viewRef.current;
    const cs = compartmentsRef.current;
    if (!view || !cs) return;
    view.dispatch({
      effects: cs.theme.reconfigure(
        buildThemeExt(
          settings.fontFamily,
          settings.fontSize,
          settings.lineNumbersFontSize,
        ),
      ),
    });
  }, [settings.fontFamily, settings.fontSize, settings.lineNumbersFontSize]);

  // 찾기 / 바꾸기 패널 열기 이벤트 수신
  useEffect(() => {
    const openFind = () => {
      setFindMode("find");
      setFindOpen(true);
    };
    const openReplace = () => {
      setFindMode("replace");
      setFindOpen(true);
    };
    window.addEventListener("editor:openFind", openFind);
    window.addEventListener("editor:openReplace", openReplace);
    return () => {
      window.removeEventListener("editor:openFind", openFind);
      window.removeEventListener("editor:openReplace", openReplace);
    };
  }, []);

  // 에디터 액션 명령 수신
  useEffect(() => {
    const handleAction = (e: Event) => {
      const view = viewRef.current;
      if (!view) return;
      switch (e.type) {
        case "editor:selectAll":
          selectAll(view);
          break;
        case "editor:undo":
          undo(view);
          break;
        case "editor:redo":
          redo(view);
          break;
        case "editor:selectNextOccurrence":
          selectNextOccurrence(view);
          break;
        case "editor:selectAllOccurrences":
          selectSelectionMatches(view);
          break;
      }
      // 메뉴 클릭으로 포커스를 잃은 경우를 대비하여 에디터에 다시 포커스를 줍니다.
      view.focus();
    };
    
    const events = [
      "editor:selectAll", "editor:undo", "editor:redo",
      "editor:selectNextOccurrence", "editor:selectAllOccurrences"
    ];
    events.forEach(ev => window.addEventListener(ev, handleAction));
    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleAction));
    };
  }, []);

  // 줄로 이동 이벤트 수신
  useEffect(() => {
    function handleGotoLine(e: Event) {
      const view = viewRef.current;
      if (!view) return;
      const lineNumber = (e as CustomEvent<number>).detail;
      const doc = view.state.doc;
      if (lineNumber < 1 || lineNumber > doc.lines) return;
      const line = doc.line(lineNumber);
      view.dispatch({
        selection: { anchor: line.from },
        scrollIntoView: true,
      });
      // requestAnimationFrame으로 focus를 지연: 현재 keydown 이벤트 처리가 끝난 뒤
      // 포커스가 잡혀야 Enter keypress가 에디터에 전달되지 않음
      requestAnimationFrame(() => view.focus());
    }
    window.addEventListener("editor:gotoLine", handleGotoLine);
    return () => window.removeEventListener("editor:gotoLine", handleGotoLine);
  }, []);

  // 클립보드 이미지 붙여넣기 (마크다운 모드 전용)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    async function handlePaste(e: ClipboardEvent) {
      if (language !== "markdown") return;
      const items = e.clipboardData?.items;
      if (!items) return;

      // 클립보드에 이미지가 있는지 확인
      const hasImage = Array.from(items).some(
        (item) => item.type.startsWith("image/"),
      );

      if (hasImage) {
        e.preventDefault();
        e.stopPropagation();

        const view = viewRef.current;
        if (!view) return;

        // 파일이 저장되지 않았으면 안내 메시지 표시
        const currentPath = filePathRef.current;
        if (!currentPath) {
          window.dispatchEvent(new CustomEvent("editor:toast", {
            detail: t.toolbar.saveFileFirst,
          }));
          return;
        }

        // 파일의 디렉토리 경로
        const dirPath = currentPath.replace(/[\\/][^\\/]+$/, "");

        try {
          const relativePath = await api.file.saveClipboardImage(dirPath);
          if (!relativePath) return;

          const pos = view.state.selection.main.head;
          const insert = `![](${relativePath})`;
          view.dispatch({
            changes: { from: pos, insert },
          });
          view.focus();
        } catch (err) {
          console.error("Failed to save clipboard image:", err);
        }
        return;
      }

      // CSV/TSV 텍스트를 마크다운 테이블로 자동 변환
      const text = e.clipboardData?.getData("text/plain");
      if (text) {
        const table = csvTsvToMarkdownTable(text);
        if (table) {
          e.preventDefault();
          e.stopPropagation();
          const view = viewRef.current;
          if (!view) return;
          const { from, to } = view.state.selection.main;
          view.dispatch({ changes: { from, to, insert: table } });
          view.focus();
        }
      }
    }

    container.addEventListener("paste", handlePaste, { capture: true });
    return () => container.removeEventListener("paste", handlePaste, { capture: true });
  }, [language]);

  const isMarkdown = language === "markdown";

  return (
    <div className="editor">
      {isMarkdown && cmView && <MarkdownToolbar view={cmView} />}
      <div className="editor__cm" ref={containerRef}>
        {findOpen && cmView && (
          <FindReplace
            view={cmView}
            initialMode={findMode}
            onClose={() => {
              setFindOpen(false);
              cmView.focus();
            }}
          />
        )}
      </div>
    </div>
  );
}
