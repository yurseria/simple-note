// Design Ref: §2.2 Flow B, §3.2, §5.5 — 3-way merge + conflict copy naming
// Plan SC: FR-23 (diff3 머지), FR-24 (충돌본 .conflict.md suffix)

import { diff3Merge } from 'node-diff3'

export interface MergeInput {
  base: string   // 마지막 sync 시점 content
  local: string  // 현재 로컬 content (사용자 편집 결과)
  remote: string // 현재 서버 content
}

export type MergeResult =
  | { kind: 'clean'; merged: string }
  | { kind: 'conflict'; local: string; remote: string }

/**
 * 3-way line merge.
 * - base → local, base → remote 양쪽 변경을 라인 단위로 머지
 * - 같은 라인이 양쪽에서 수정되면 conflict 로 판정 (local/remote 원본 유지)
 *
 * node-diff3 의 diff3Merge(a, o, b) 시그니처: a=local, o=base, b=remote.
 * regions 는 `{ ok: string[] }` (clean) 또는 `{ conflict: {...} }` (conflict).
 */
export function merge3Way({ base, local, remote }: MergeInput): MergeResult {
  // 동일한 입력은 즉시 clean 반환 (성능)
  if (local === remote) return { kind: 'clean', merged: local }
  if (base === local) return { kind: 'clean', merged: remote }
  if (base === remote) return { kind: 'clean', merged: local }

  const localLines = local.split('\n')
  const baseLines = base.split('\n')
  const remoteLines = remote.split('\n')

  // node-diff3: (a=local, o=base, b=remote), returns regions
  const regions = diff3Merge(localLines, baseLines, remoteLines) as Array<
    { ok: string[] } | { conflict: unknown }
  >

  const merged: string[] = []
  for (const region of regions) {
    if ('ok' in region) {
      merged.push(...region.ok)
    } else {
      // 하나라도 conflict region 이 있으면 전체를 충돌로 처리
      return { kind: 'conflict', local, remote }
    }
  }

  return { kind: 'clean', merged: merged.join('\n') }
}

/**
 * 충돌본 파일명 생성:
 * - `meeting.md` → `meeting.conflict.md`
 * - 이미 `meeting.conflict.md` 존재 → `meeting.conflict-2.md`
 * - 이후 `meeting.conflict-3.md`, `meeting.conflict-4.md` ...
 *
 * 확장자 없는 파일은 `name.conflict` 형식.
 */
export function buildConflictFilename(
  originalName: string,
  existingNamesInFolder: readonly string[]
): string {
  const existing = new Set(existingNamesInFolder)
  const { stem, ext } = splitExt(originalName)

  // 첫 시도: name.conflict.ext
  const first = `${stem}.conflict${ext}`
  if (!existing.has(first)) return first

  // name.conflict-2.ext, name.conflict-3.ext, ...
  for (let n = 2; n < 10_000; n++) {
    const candidate = `${stem}.conflict-${n}${ext}`
    if (!existing.has(candidate)) return candidate
  }

  throw new Error('buildConflictFilename: exceeded 10,000 candidates')
}

// ── helpers ──

interface SplitExtResult {
  stem: string
  ext: string
}

function splitExt(name: string): SplitExtResult {
  const idx = name.lastIndexOf('.')
  if (idx <= 0) return { stem: name, ext: '' }
  return { stem: name.slice(0, idx), ext: name.slice(idx) }
}
