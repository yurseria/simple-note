import { useMemo, useRef, useEffect, useCallback } from "react";
import { marked, type Token, type Tokens } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import DOMPurify from "dompurify";
import mermaid from "mermaid";
import "./MarkdownPreview.css";

// mermaid 초기화 (startOnLoad: false → useEffect에서 수동 실행)
mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });

function getMermaidTheme(theme: string) {
  return theme === "light" ? "default" : "dark";
}

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

/**
 * marked lexer의 토큰을 사용해 소스 줄 번호를 계산.
 * 토큰의 raw 길이를 누적해서 각 최상위 블록 토큰의 시작 줄을 추적한다.
 */
function getTokenLineMap(markdown: string): number[] {
  const tokens = marked.lexer(markdown);
  const lineMap: number[] = [];
  let offset = 0;

  for (const token of tokens) {
    // 빈 space 토큰 등은 스킵
    if (token.type === "space") {
      offset += (token.raw.match(/\n/g) || []).length;
      continue;
    }
    lineMap.push(offset + 1); // 1-based
    offset += (token.raw.match(/\n/g) || []).length;
  }
  return lineMap;
}

/**
 * HTML의 최상위 블록 요소에 data-source-line 속성을 삽입.
 * marked lexer 토큰 순서와 HTML 블록 순서가 1:1로 대응됨.
 */
function addSourceLines(markdown: string, html: string): string {
  const lineMap = getTokenLineMap(markdown);
  let idx = 0;
  return html.replace(
    /(<(?:h[1-6]|p|ul|ol|blockquote|pre|table|hr|div)(?=[\s>]))/g,
    (match) => {
      if (idx < lineMap.length) {
        const line = lineMap[idx++];
        return `${match} data-source-line="${line}"`;
      }
      return match;
    },
  );
}

// DOMPurify가 data-source-line 속성을 제거하지 않도록 허용
DOMPurify.addHook("uponSanitizeAttribute", (_, data) => {
  if (data.attrName === "data-source-line") {
    data.forceKeepAttr = true;
  }
});

interface Props {
  content: string;
  topLine?: number;
  theme?: string;
  basePath?: string | null;
  convertFileSrc?: (filePath: string) => string;
  onOpenFile?: (filePath: string) => void;
}

export function MarkdownPreview({
  content,
  topLine,
  theme = "dark",
  basePath,
  convertFileSrc,
  onOpenFile,
}: Props): JSX.Element {
  const html = useMemo(() => {
    const raw = markedInstance.parse(content, { async: false }) as string;
    const withLines = addSourceLines(content, raw);
    let sanitized = DOMPurify.sanitize(withLines);
    // 상대 경로 이미지를 asset:// URL로 변환
    if (basePath && convertFileSrc) {
      const dir = basePath.replace(/[\\/][^\\/]+$/, "");
      sanitized = sanitized.replace(
        /(<img\s[^>]*src=")(?!https?:\/\/|data:|asset:\/\/)([^"]+)(")/g,
        (_, pre, src, post) => {
          let absPath = src.startsWith("/") ? src : `${dir}/${src}`;
          absPath = absPath.replace(/\/\.\//g, "/").replace(/[^/]+\/\.\.\//g, "");
          return `${pre}${convertFileSrc(absPath)}${post}`;
        },
      );
    }
    return sanitized;
  }, [content, basePath, convertFileSrc]);

  const containerRef = useRef<HTMLDivElement>(null);

  // mermaid 다이어그램 렌더링 — html 변경 후 DOM에 .mermaid 요소를 찾아 실행
  const renderMermaid = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    const nodes = el.querySelectorAll<HTMLElement>(".mermaid");
    if (nodes.length === 0) return;

    nodes.forEach((node) => {
      if (!node.getAttribute("data-original")) {
        node.setAttribute("data-original", node.textContent ?? "");
      } else {
        node.textContent = node.getAttribute("data-original") ?? "";
      }
      node.removeAttribute("data-processed");
    });

    try {
      await mermaid.run({ nodes });
    } catch {
      // 문법 오류 시 mermaid가 에러 메시지를 요소 안에 표시함
    }
  }, []);

  // 에디터 테마 변경 시 mermaid 테마도 동기화
  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: getMermaidTheme(theme), securityLevel: "strict" });
    renderMermaid();
  }, [theme, renderMermaid]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => renderMermaid());
    return () => cancelAnimationFrame(frame);
  }, [html, renderMermaid]);

  // 커서 줄에 해당하는 프리뷰 요소를 맨 위로 스크롤
  useEffect(() => {
    if (topLine == null || topLine < 1) return;
    const el = containerRef.current;
    if (!el) return;

    const elements = el.querySelectorAll<HTMLElement>("[data-source-line]");
    if (elements.length === 0) return;

    // topLine 이하이면서 가장 가까운 요소 찾기
    let closest: HTMLElement | null = null;
    for (const elem of elements) {
      const line = parseInt(elem.getAttribute("data-source-line") || "0", 10);
      if (line <= topLine) {
        closest = elem;
      } else {
        break; // 정렬되어 있으므로 넘어가면 종료
      }
    }

    if (!closest) closest = elements[0];

    const containerTop = el.getBoundingClientRect().top;
    const elementTop = closest.getBoundingClientRect().top;
    el.scrollTop += elementTop - containerTop;
  }, [topLine]);

  useEffect(() => {
    if (!onOpenFile) return;
    const el = containerRef.current;
    if (!el) return;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // 외부 URL, 앵커, 특수 스킴은 무시
      if (/^(https?|mailto|data|asset):\/\//i.test(href) || href.startsWith("#")) return;
      // .md / .markdown / .txt 파일만 처리
      if (!/\.(md|markdown|txt)$/i.test(href.split("?")[0].split("#")[0])) return;

      e.preventDefault();
      const dir = basePath ? basePath.replace(/[\\/][^\\/]+$/, "") : "";
      const absPath = href.startsWith("/") ? href : `${dir}/${href}`;
      onOpenFile(absPath);
    };

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [onOpenFile, basePath]);

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
