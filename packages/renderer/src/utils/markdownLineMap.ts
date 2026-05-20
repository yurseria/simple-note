import { marked } from "marked";

/** Returns a 1-based source line number for each non-space top-level markdown block. */
export function getTokenLineMap(markdown: string): number[] {
  const tokens = marked.lexer(markdown);
  const lineMap: number[] = [];
  let offset = 0;
  for (const token of tokens) {
    if (token.type === "space") {
      offset += (token.raw.match(/\n/g) || []).length;
      continue;
    }
    lineMap.push(offset + 1);
    offset += (token.raw.match(/\n/g) || []).length;
  }
  return lineMap;
}
