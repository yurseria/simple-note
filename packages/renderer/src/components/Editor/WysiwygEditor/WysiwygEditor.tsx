import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
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
import { getTokenLineMap } from "../../../utils/markdownLineMap";
import "./WysiwygEditor.css";

export interface WysiwygEditorHandle {
  scrollToSourceLine: (line: number) => void;
}

interface Props {
  content: string;
  onChange: (content: string) => void;
  theme: "dark" | "light";
  fontSize?: number;
  onCursorLine?: (line: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onEditorReady?: (editor: Editor) => void;
}

/** Stamps data-source-line on each direct child of the ProseMirror root. */
function annotateSourceLines(pmDom: Element, content: string) {
  const lineMap = getTokenLineMap(content);
  const children = Array.from(pmDom.children) as HTMLElement[];
  children.forEach((child, i) => {
    if (i < lineMap.length) {
      child.dataset.sourceLine = String(lineMap[i]);
    } else {
      delete child.dataset.sourceLine;
    }
  });
}

const MilkdownInner = forwardRef<WysiwygEditorHandle, Props>(function MilkdownInner(
  { content, onChange, onCursorLine, onFocus, onBlur, onEditorReady },
  ref,
) {
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

  // Stable ref to get() so useImperativeHandle doesn't need to re-run
  const getRef = useRef(get);
  getRef.current = get;

  useImperativeHandle(ref, () => ({
    scrollToSourceLine(line: number) {
      const editor = getRef.current?.();
      if (!editor) return;
      try {
        editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          annotateSourceLines(view.dom, contentRef.current);
          const elements = Array.from(
            view.dom.querySelectorAll<HTMLElement>("[data-source-line]"),
          );
          if (elements.length === 0) return;
          let target: HTMLElement = elements[0];
          for (const el of elements) {
            const srcLine = parseInt(el.dataset.sourceLine!, 10);
            if (srcLine <= line) target = el;
            else break;
          }
          target.scrollIntoView({ block: "center", behavior: "smooth" });
        });
      } catch { /* editor may not be ready */ }
    },
  }), []); // eslint-disable-line

  // Fire onEditorReady + attach click listener once editor is ready
  // get is intentionally excluded — only the loading→false transition matters.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (loading) return;
    const editor = get();
    if (!editor) return;
    onEditorReadyRef.current?.(editor);

    let pm: Element | null = null;
    editor.action((ctx) => { pm = ctx.get(editorViewCtx).dom; });
    if (!pm) return;

    const handleClick = (e: Event) => {
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        annotateSourceLines(view.dom, contentRef.current);
        const target = (e.target as Element).closest("[data-source-line]");
        if (!target) return;
        const line = parseInt((target as HTMLElement).dataset.sourceLine!, 10);
        if (!isNaN(line)) onCursorLineRef.current?.(line);
      });
    };

    (pm as Element).addEventListener("click", handleClick);
    return () => (pm as Element).removeEventListener("click", handleClick);
  }, [loading]); // eslint-disable-line

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
});

export const WysiwygEditor = forwardRef<WysiwygEditorHandle, Props>(function WysiwygEditor(props, ref) {
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    // If clicked outside ProseMirror content, focus editor at end
    if ((e.target as HTMLElement).closest(".ProseMirror")) return;
    const pm = e.currentTarget.querySelector<HTMLElement>(".ProseMirror");
    pm?.focus();
  }

  return (
    <MilkdownProvider>
      <div
        className={`wysiwyg-editor wysiwyg-editor--${props.theme}`}
        style={props.fontSize ? { fontSize: props.fontSize } : undefined}
        onClick={handleClick}
      >
        <MilkdownInner ref={ref} {...props} />
      </div>
    </MilkdownProvider>
  );
});
