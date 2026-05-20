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
import { NodeSelection, TextSelection } from "@milkdown/kit/prose/state";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { marked, type Tokens } from "marked";
import "./WysiwygEditor.css";

export interface WysiwygEditorHandle {
  scrollToSourceLine: (line: number) => void;
}

interface Props {
  content: string;
  onChange: (content: string) => void;
  theme: "dark" | "light";
  fontSize?: number;
  basePath?: string | null;
  convertFileSrc?: (filePath: string) => string;
  onCursorLine?: (line: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onEditorReady?: (editor: Editor) => void;
}

function annotateListItems(pmListEl: Element, items: Tokens.ListItem[], startOffset: number) {
  const pmItems = Array.from(pmListEl.querySelectorAll<HTMLElement>(":scope > li"));
  let offset = startOffset;
  for (let i = 0; i < items.length && i < pmItems.length; i++) {
    const item = items[i];
    pmItems[i].dataset.sourceLine = String(offset + 1);
    // Recurse into nested list if present
    const nestedToken = item.tokens?.find((t): t is Tokens.List => t.type === "list");
    if (nestedToken) {
      const nestedEl = pmItems[i].querySelector<HTMLElement>(":scope > ul, :scope > ol");
      if (nestedEl) {
        // Nested list occupies the last N lines of this item's raw — derive its start offset.
        // Use nestedToken.raw (not item raws sum) because marked v17 omits the trailing \n
        // from the last list item, causing item-sum to undercount lines by 1.
        const nestedRaw = nestedToken.raw;
        const nestedLineCount = (nestedRaw.match(/\n/g) || []).length + (nestedRaw.endsWith("\n") ? 0 : 1);
        // Trim trailing blank lines from item.raw: loose lists append \n\n to separate
        // items, inflating the count and shifting the nested start offset by 1.
        const itemLineCount = (item.raw.replace(/\n+$/, "\n").match(/\n/g) || []).length;
        annotateListItems(nestedEl, nestedToken.items, offset + (itemLineCount - nestedLineCount));
      }
    }
    offset += (item.raw.match(/\n/g) || []).length;
  }
}

/**
 * Stamps data-source-line on each direct child of the ProseMirror root.
 * For lists, recurses into nested <li>/<ol>/<ul> so clicking any item gives the exact line.
 */
function annotateSourceLines(pmDom: Element, content: string) {
  const tokens = marked.lexer(content);
  const children = Array.from(pmDom.children) as HTMLElement[];
  let childIdx = 0;
  let lineOffset = 0;

  for (const token of tokens) {
    if (token.type === "space") {
      lineOffset += (token.raw.match(/\n/g) || []).length;
      continue;
    }
    const child = children[childIdx++];
    if (child) {
      child.dataset.sourceLine = String(lineOffset + 1);
      if (token.type === "list") {
        annotateListItems(child, (token as Tokens.List).items, lineOffset);
      }
    }
    lineOffset += (token.raw.match(/\n/g) || []).length;
  }
  for (let i = childIdx; i < children.length; i++) {
    delete children[i].dataset.sourceLine;
  }
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
          annotateSourceLines(view.dom, lastContentRef.current);
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
        const { state } = view;

        // 줄 사이 여백 클릭 시 ProseMirror가 block 노드에 NodeSelection을 생성하면
        // .ProseMirror-selectednode 클래스(outline 하이라이트)가 붙는 문제 수정.
        // leaf가 아닌 노드(p, h1~h6, ul/ol 등)의 NodeSelection은 TextSelection으로 변환.
        if (state.selection instanceof NodeSelection && !state.selection.node.isLeaf) {
          const resolved = state.doc.resolve(
            Math.min(state.selection.from + 1, state.doc.content.size)
          );
          view.dispatch(state.tr.setSelection(TextSelection.near(resolved)));
          return;
        }

        // WebKit contenteditable은 margin 영역 클릭도 인접 <p>로 e.target/elementFromPoint를
        // resolve하므로 좌표 기반 hit-test는 모두 신뢰할 수 없음.
        // 대신 ProseMirror가 cursor를 놓은 위치를 역산해 실제 텍스트 줄 범위를 구하고,
        // 클릭 Y가 그 범위 밖이면 margin 클릭으로 판단.
        const me = e as MouseEvent;
        const cursor = (view.state.selection as TextSelection).$cursor;
        if (!cursor) return;
        const cc = view.coordsAtPos(cursor.pos);
        if (me.clientY < cc.top || me.clientY > cc.bottom) return;

        annotateSourceLines(view.dom, lastContentRef.current);
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
  // getRef 사용 — get을 deps에 넣으면 useEditor가 매 렌더마다 새 참조를 반환해
  // 이펙트가 불필요하게 재실행되고 tr.replaceWith(0, size, …)로 커서가 0으로 이동,
  // 결과적으로 스크롤이 최상단으로 올라가는 버그 발생
  useEffect(() => {
    if (content === lastContentRef.current) return;
    const editor = getRef.current?.();
    if (!editor) return;
    try {
      editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const parser = ctx.get(parserCtx);
        const doc = parser(content);
        if (!doc) return;
        const { state } = view;
        const scrollEl = view.dom.parentElement;
        const savedScrollTop = scrollEl?.scrollTop ?? 0;
        const tr = state.tr.replaceWith(0, state.doc.content.size, doc.content);
        view.dispatch(tr);
        if (scrollEl) scrollEl.scrollTop = savedScrollTop;
        lastContentRef.current = content;
      });
    } catch {
      // editor may not be ready yet
    }
  }, [content]); // eslint-disable-line

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
