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
  onFocus?: () => void;
  onBlur?: () => void;
  onEditorReady?: (editor: Editor) => void;
}

function MilkdownInner({
  content,
  onChange,
  onFocus,
  onBlur,
  onEditorReady,
}: Props) {
  const lastContentRef = useRef(content);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;
  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;

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

  // Propagate onEditorReady once editor finishes loading
  useEffect(() => {
    if (loading) return;
    const editor = get();
    if (editor) onEditorReadyRef.current?.(editor);
  }, [loading, get]);

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
  return (
    <MilkdownProvider>
      <div className={`wysiwyg-editor wysiwyg-editor--${props.theme}`}>
        <MilkdownInner {...props} />
      </div>
    </MilkdownProvider>
  );
}
