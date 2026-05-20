import { useEffect, useRef } from "react";
import { MilkdownProvider, Milkdown, useEditor } from "@milkdown/react";
import { Editor } from "@milkdown/kit/core";
import {
  editorViewCtx,
  parserCtx,
  defaultValueCtx,
  rootCtx,
  remarkStringifyOptionsCtx,
} from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import "./WysiwygEditor.css";

interface Props {
  content: string;
  onChange: (content: string) => void;
  theme: "dark" | "light";
  fontSize?: number;
  topLine?: number;
  onCursorLine?: (line: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onEditorReady?: (editor: Editor) => void;
}

// Map markdown source line number → top-level block index
function lineToBlockIndex(content: string, line: number): number {
  const lines = content.split("\n");
  let blockIdx = -1;
  let inBlock = false;
  for (let i = 0; i < lines.length && i < line; i++) {
    const empty = !lines[i].trim();
    if (!empty && !inBlock) { blockIdx++; inBlock = true; }
    else if (empty) inBlock = false;
  }
  return Math.max(0, blockIdx);
}

// Map top-level block index → markdown source line number (1-based)
function blockIndexToLine(content: string, blockIndex: number): number {
  const lines = content.split("\n");
  let blockIdx = -1;
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const empty = !lines[i].trim();
    if (!empty && !inBlock) {
      if (++blockIdx === blockIndex) return i + 1;
      inBlock = true;
    } else if (empty) inBlock = false;
  }
  return 1;
}

function MilkdownInner({
  content,
  onChange,
  topLine,
  onCursorLine,
  onFocus,
  onBlur,
  onEditorReady,
}: Props) {
  const lastContentRef = useRef(content);
  const contentRef = useRef(content);
  contentRef.current = content;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;
  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;
  const onCursorLineRef = useRef(onCursorLine);
  onCursorLineRef.current = onCursorLine;
  const lastTopLineRef = useRef<number | undefined>(undefined);

  const { get, loading } = useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
        ctx.set(remarkStringifyOptionsCtx, {
          rule: "-",
          emphasis: "*",
          strong: "*",
        });
        ctx.get(listenerCtx)
          .markdownUpdated((_ctx, markdown) => {
            lastContentRef.current = markdown;
            onChangeRef.current(markdown);
          })
          .focus(() => onFocusRef.current?.())
          .blur(() => onBlurRef.current?.());
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener);
    // content intentionally excluded — useEffect handles sync
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Propagate onEditorReady + attach WYSIWYG→CM click listener once editor is ready.
  // get is intentionally excluded — only the loading→false transition matters.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (loading) return;
    const editor = get();
    if (!editor) return;
    onEditorReadyRef.current?.(editor);

    // Grab the ProseMirror DOM node for click listening
    let pm: Element | null = null;
    editor.action((ctx) => { pm = ctx.get(editorViewCtx).dom; });
    if (!pm) return;

    const handleClick = () => {
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const resolved = view.state.selection.$head;
        const blockIdx = resolved.index(0);
        const line = blockIndexToLine(contentRef.current, blockIdx);
        onCursorLineRef.current?.(line);
      });
    };

    (pm as Element).addEventListener("click", handleClick);
    return () => (pm as Element).removeEventListener("click", handleClick);
  }, [loading]); // eslint-disable-line

  // CM → WYSIWYG: scroll to block corresponding to topLine
  useEffect(() => {
    if (topLine === lastTopLineRef.current) return;
    lastTopLineRef.current = topLine;
    if (topLine == null) return;
    const editor = get();
    if (!editor) return;
    try {
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const blockIdx = lineToBlockIndex(contentRef.current, topLine);
        const children = view.dom.children;
        const target = children[Math.min(blockIdx, children.length - 1)] as HTMLElement | undefined;
        target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    } catch { /* editor may not be ready */ }
  }, [topLine, get]);

  // Sync external content changes (from CodeMirror pane)
  useEffect(() => {
    if (content === lastContentRef.current) return;
    const editor = get();
    if (!editor) return;
    try {
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const parser = ctx.get(parserCtx);
        const doc = parser(content);
        if (!doc) return;
        const { state } = view;
        const tr = state.tr.replaceWith(0, state.doc.content.size, doc.content);
        view.dispatch(tr);
        lastContentRef.current = content;
      });
    } catch {
      // editor may not be ready yet
    }
  }, [content, get]);

  return <Milkdown />;
}

export function WysiwygEditor(props: Props) {
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    // If clicked outside ProseMirror content, focus editor at end
    if ((e.target as HTMLElement).closest('.ProseMirror')) return;
    const pm = e.currentTarget.querySelector<HTMLElement>('.ProseMirror');
    pm?.focus();
  }

  return (
    <MilkdownProvider>
      <div
        className={`wysiwyg-editor wysiwyg-editor--${props.theme}`}
        style={props.fontSize ? { fontSize: props.fontSize } : undefined}
        onClick={handleClick}
      >
        <MilkdownInner {...props} />
      </div>
    </MilkdownProvider>
  );
}
