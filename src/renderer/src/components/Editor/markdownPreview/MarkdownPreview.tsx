import { useMemo, useRef, useEffect } from "react";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import DOMPurify from "dompurify";
import "./MarkdownPreview.css";

// marked + highlight.js 통합 — 코드 블록 언어별 syntax highlight
const markedInstance = marked.use(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
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
