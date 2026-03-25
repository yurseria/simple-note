import { useMemo, useRef, useEffect, useCallback } from "react";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import DOMPurify from "dompurify";
import mermaid from "mermaid";
import "./MarkdownPreview.css";

// mermaid 초기화 (startOnLoad: false → useEffect에서 수동 실행)
mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });

// marked + highlight.js 통합 — 코드 블록 언어별 syntax highlight
const markedInstance = marked.use(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang) {
      if (lang === "mermaid") return code;
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
  {
    renderer: {
      code({ text, lang }: { text: string; lang?: string }) {
        if (lang === "mermaid") {
          const escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `<div class="mermaid">${escaped}</div>`;
        }
        return false; // 기본 highlight 렌더러로 fallthrough
      },
    },
  },
);

interface Props {
  content: string;
  scrollToBottom?: number;
}

export function MarkdownPreview({
  content,
  scrollToBottom,
}: Props): JSX.Element {
  const html = useMemo(() => {
    const raw = markedInstance.parse(content, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [content]);

  const containerRef = useRef<HTMLDivElement>(null);

  // mermaid 다이어그램 렌더링 — html 변경 후 DOM에 .mermaid 요소를 찾아 실행
  const renderMermaid = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    const nodes = el.querySelectorAll<HTMLElement>(".mermaid:not([data-processed])");
    if (nodes.length === 0) return;
    try {
      await mermaid.run({ nodes });
    } catch {
      // 문법 오류 시 mermaid가 에러 메시지를 요소 안에 표시함
    }
  }, []);

  useEffect(() => {
    renderMermaid();
  }, [html, renderMermaid]);

  // scrollToBottom 카운터가 바뀌면 프리뷰를 맨 아래로 스크롤
  // html도 deps에 포함 — content 변경으로 HTML이 재렌더된 뒤 새 높이 기준으로 스크롤
  useEffect(() => {
    if (!scrollToBottom) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [scrollToBottom, html]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const pre = (e.target as Element).closest("pre");
      if (!pre) return;
      if (pre.scrollWidth <= pre.clientWidth) return;

      e.preventDefault();
      pre.scrollLeft += e.deltaY;
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
