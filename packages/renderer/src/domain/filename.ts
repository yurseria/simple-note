// Design Ref: §3.2, §5.5 — filename policy
// Plan SC: FR-29 (H1 자동 변환), FR-30 (중복 자동 suffix), FR-31 (rename 인라인 에러)

export type FileExt = 'md' | 'txt'

const UNTITLED = '제목 없음'

// 경로 특수문자 (Drive 쿼리 이스케이프 이슈 + 표시 깨짐 방지)
// NOTE: g flag 없이 정의 — test() 의 stateful 동작 회피.
// replace 에서는 인라인으로 g flag 를 새로 지정한다.
const FORBIDDEN_CHARS = /[\/\\\x00-\x1f]/

function sanitizeTitle(raw: string): string {
  return raw
    .replace(/[\/\\\x00-\x1f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * 마크다운/텍스트 본문에서 파일명을 도출한다.
 * - 마크다운: 첫 `# H1` (ATX) 라인에서 텍스트 추출
 * - 없거나 공백만 있으면 `제목 없음.{ext}`
 * - `/`, `\`, 제어문자 제거
 */
export function deriveFilenameFromContent(content: string, ext: FileExt): string {
  const lines = content.split('\n')
  let title = ''

  for (const line of lines) {
    // ATX H1: `# text` (단, `##` 등은 제외)
    const match = /^\s*#\s+(.+?)\s*#*\s*$/.exec(line)
    if (match) {
      title = sanitizeTitle(match[1])
      if (title) break
    }
    // 빈 줄이 아닌 의미 있는 라인이 H1 없이 먼저 등장하면 중단
    if (line.trim() && !line.trim().startsWith('#')) break
  }

  const base = title || UNTITLED
  return `${base}.${ext}`
}

/**
 * 저장 시 동일 이름이 존재하면 자동 suffix `(2)`, `(3)`, ...
 * - Plan §7.2: 저장 경로 자동, rename 경로와 구분
 */
export function resolveUniqueName(
  desiredName: string,
  existingNames: readonly string[]
): { name: string; renamed: boolean } {
  if (!existingNames.includes(desiredName)) {
    return { name: desiredName, renamed: false }
  }

  const { stem, ext } = splitExt(desiredName)

  // 이미 `(N)` suffix 가 붙어있으면 해당 N 에서 증가
  const existingSuffix = /\s\((\d+)\)$/.exec(stem)
  const baseStem = existingSuffix ? stem.slice(0, existingSuffix.index) : stem
  let n = existingSuffix ? parseInt(existingSuffix[1], 10) + 1 : 2

  // 안전 상한 (무한 루프 방지)
  while (n < 10_000) {
    const candidate = `${baseStem} (${n})${ext}`
    if (!existingNames.includes(candidate)) {
      return { name: candidate, renamed: true }
    }
    n++
  }

  throw new Error('resolveUniqueName: exceeded 10,000 candidates')
}

export type RenameValidation =
  | { ok: true }
  | { ok: false; reason: 'duplicate' | 'empty' | 'invalid-chars' }

/**
 * 사용자의 명시적 rename 검증.
 * - 중복: 인라인 에러 (자동 suffix 적용 X — FR-31)
 * - 빈 이름: 거부
 * - 경로 특수문자: 거부
 */
export function validateRename(
  newName: string,
  existingNames: readonly string[]
): RenameValidation {
  const trimmed = newName.trim()
  if (!trimmed) return { ok: false, reason: 'empty' }
  if (FORBIDDEN_CHARS.test(newName)) return { ok: false, reason: 'invalid-chars' }
  if (existingNames.includes(newName)) return { ok: false, reason: 'duplicate' }
  return { ok: true }
}

// ── helpers ──

interface SplitExtResult {
  stem: string
  ext: string // '' or '.md' / '.txt' etc (포함 점)
}

function splitExt(name: string): SplitExtResult {
  const idx = name.lastIndexOf('.')
  if (idx <= 0) return { stem: name, ext: '' }
  return { stem: name.slice(0, idx), ext: name.slice(idx) }
}
