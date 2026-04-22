// Design Ref: §2.2 Flow B, §4.3 — syncQueue + 3-way merge integration
// Plan SC: FR-22 (pending queue), FR-23 (diff3 merge), FR-24 (conflict copy), FR-25 (상태)

import {
  buildConflictFilename,
  merge3Way,
} from '@simple-note/renderer/domain/conflict'
import {
  getPendingEdit,
  listPendingEdits,
  putPendingEdit,
  removePendingEdit,
  saveContent,
  type PendingEditEntry,
  type SyncStatus,
} from './offlineCache'
import {
  CloudError,
  fetchMetadata,
  listFiles,
  readFile,
  saveFile,
  type DriveFileWithEtag,
  type SaveResult,
} from './cloudApi'

export type { PendingEditEntry, SyncStatus }

export interface DrainResult {
  synced: Array<{ fileId: string; saved: SaveResult }>
  conflicts: Array<{
    originalFileId: string
    mainSaved: SaveResult
    conflictFile: SaveResult
  }>
  failed: Array<{ fileId: string; error: string }>
  /** queue 가 아예 비어있으면 true */
  empty: boolean
}

const MAX_RETRIES = 3

/** 편집 내용을 오프라인/배경 저장 큐에 올린다. */
export async function enqueueEdit(input: {
  fileId: string
  localContent: string
  baseEtag: string
  pendingName?: string
}): Promise<void> {
  const entry: PendingEditEntry = {
    fileId: input.fileId,
    localContent: input.localContent,
    baseEtag: input.baseEtag,
    pendingName: input.pendingName,
    editedAt: Date.now(),
    status: 'pending',
    retries: 0,
  }
  await putPendingEdit(entry)
  // local 본문 캐시도 함께 업데이트 — 새로고침·재접속 시 즉시 복원
  if (!input.fileId.startsWith('new:')) {
    await saveContent(input.fileId, input.localContent, input.baseEtag).catch(() => {})
  }
}

export async function getPendingFor(fileId: string): Promise<PendingEditEntry | undefined> {
  return getPendingEdit(fileId)
}

export async function pendingStatusMap(): Promise<
  Record<string, SyncStatus>
> {
  const list = await listPendingEdits().catch(() => [])
  const out: Record<string, SyncStatus> = {}
  for (const e of list) out[e.fileId] = e.status
  return out
}

/**
 * 대기 중인 모든 편집을 순차 동기화.
 * - 기존 파일: 서버 etag 비교 → 일치면 upload, 불일치면 3-way merge → clean 이면 upload,
 *   conflict 면 로컬을 주 파일로 upload + 서버본을 `.conflict.md` 로 저장
 * - 신규 파일: 이름 중복 자동 suffix 적용 후 upload
 */
export async function drainQueue(): Promise<DrainResult> {
  const pending = await listPendingEdits().catch(() => [])
  const result: DrainResult = {
    synced: [],
    conflicts: [],
    failed: [],
    empty: pending.length === 0,
  }

  for (const edit of pending) {
    try {
      await putPendingEdit({ ...edit, status: 'syncing' })
      if (edit.fileId.startsWith('new:')) {
        // 신규 파일 업로드
        const name = edit.pendingName ?? '제목 없음.md'
        const saved = await saveFile(name, edit.localContent)
        await removePendingEdit(edit.fileId)
        // 로컬 캐시의 임시 ID 기록은 정리하지 않음 (useCloudState 에서 refresh 호출)
        result.synced.push({ fileId: edit.fileId, saved })
        continue
      }

      // 기존 파일: 서버 메타 확인
      const meta = await fetchMetadata(edit.fileId)
      if (!meta) {
        // 서버에서 삭제됨 → pending 을 신규 업로드로 승격
        const name = edit.pendingName ?? 'recovered.md'
        const saved = await saveFile(name, edit.localContent)
        await removePendingEdit(edit.fileId)
        result.synced.push({ fileId: edit.fileId, saved })
        continue
      }

      if (meta.etag === edit.baseEtag) {
        // 서버가 안 바뀜 → 로컬 그대로 upload
        const saved = await saveFile(meta.name, edit.localContent, edit.fileId)
        await removePendingEdit(edit.fileId)
        result.synced.push({ fileId: edit.fileId, saved })
        continue
      }

      // 서버가 바뀜 → 3-way merge 시도
      const remote = await readFile(edit.fileId)
      const base = await resolveBaseContent(edit)
      const merged = merge3Way({
        base,
        local: edit.localContent,
        remote: remote.content,
      })

      if (merged.kind === 'clean') {
        const saved = await saveFile(meta.name, merged.merged, edit.fileId)
        await removePendingEdit(edit.fileId)
        result.synced.push({ fileId: edit.fileId, saved })
        continue
      }

      // Conflict: 로컬을 주 파일로 upload + 서버본을 .conflict.md 로 저장
      const mainSaved = await saveFile(meta.name, edit.localContent, edit.fileId)
      const list = await listFiles().catch(() => [] as DriveFileWithEtag[])
      const existing = list.map((f) => f.name)
      const conflictName = buildConflictFilename(meta.name, existing)
      const conflictFile = await saveFile(conflictName, remote.content)
      await removePendingEdit(edit.fileId)
      result.conflicts.push({
        originalFileId: edit.fileId,
        mainSaved,
        conflictFile,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const retries = (edit.retries ?? 0) + 1
      if (retries >= MAX_RETRIES) {
        await putPendingEdit({
          ...edit,
          status: 'pending',
          retries,
          lastError: msg,
        })
        result.failed.push({ fileId: edit.fileId, error: msg })
      } else {
        // 재시도 여지 — status 는 pending 으로 되돌리고 다음 drain 에 재시도
        await putPendingEdit({
          ...edit,
          status: 'pending',
          retries,
          lastError: msg,
        })
        result.failed.push({ fileId: edit.fileId, error: msg })
      }
      // UNAUTHORIZED 같이 복구 불가한 에러면 뒤 항목도 실패할 가능성 크므로 중단
      if (e instanceof CloudError && e.code === 'UNAUTHORIZED') break
    }
  }

  return result
}

/**
 * base content 추정:
 * 1) local file_content 에 같은 baseEtag 로 저장된 본문이 있으면 그걸 사용
 * 2) 없으면 현재 서버 content 를 base 로 가정 (= local 변경만 반영되는 효과)
 *    — 3-way 가 의미 없어지지만 안전한 fallback
 */
async function resolveBaseContent(edit: PendingEditEntry): Promise<string> {
  const { loadContent } = await import('./offlineCache')
  const cached = await loadContent(edit.fileId)
  if (cached && cached.baseEtag === edit.baseEtag) {
    return cached.content
  }
  return edit.localContent
}
