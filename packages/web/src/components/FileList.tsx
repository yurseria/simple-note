// Design Ref: §5.4 PWA Files List — Page UI Checklist (모바일/데스크탑 공통)
// Plan SC: FR-11 (클라우드만 표시), FR-07 (검색), FR-21 (미캐시 🔒), FR-25 (⚠️ 뱃지)

'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DriveFile } from '@simple-note/renderer/types/api'
import type { SyncStatus } from '../lib/offlineCache'
import { SyncStatusBadge } from './SyncStatusBadge'
import './FileList.css'

const ICON_FILE_TEXT =
  'M21 8v12.993A1 1 0 0 1 20.007 22H3.993A.993.993 0 0 1 3 21.008V2.992C3 2.444 3.445 2 3.993 2H14v7h7zm-2 0h-5V3H5v16h14V8zM8 12h8v2H8v-2zm0 4h8v2H8v-2zm0-8h3v2H8V8z'
const ICON_FILE =
  'M21 8v12.993A1 1 0 0 1 20.007 22H3.993A.993.993 0 0 1 3 21.008V2.992C3 2.444 3.445 2 3.993 2H14v7h7zm-2 0h-5V3H5v16h14V8z'
const ICON_SEARCH =
  'M18.031 16.617l4.283 4.282-1.415 1.415-4.282-4.283A8.96 8.96 0 0 1 11 20c-4.968 0-9-4.032-9-9s4.032-9 9-9 9 4.032 9 9a8.96 8.96 0 0 1-1.969 5.617zm-2.006-.742A6.977 6.977 0 0 0 18 11c0-3.867-3.133-7-7-7-3.867 0-7 3.133-7 7 0 3.867 3.133 7 7 7a6.977 6.977 0 0 0 4.875-1.975l.15-.15z'
const ICON_CHEVRON =
  'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z'
const ICON_LOCK =
  'M6 8V7a6 6 0 1 1 12 0v1h3v14H3V8h3zm2 0h8V7a4 4 0 1 0-8 0v1zm3 7v3h2v-3h-2z'

function isMd(name: string): boolean {
  const l = name.toLowerCase()
  return l.endsWith('.md') || l.endsWith('.markdown')
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

function isConflictName(name: string): boolean {
  return /\.conflict(?:-\d+)?\.(md|markdown|txt)$/i.test(name)
}

interface Props {
  files: DriveFile[]
  loading?: boolean
  emptyMessage?: string
  /** 오프라인 상태에서 열람 가능한 파일 ID 집합 */
  cachedIds?: Set<string>
  online?: boolean
  /** 오프라인 + 미캐시 파일 클릭 시 호출 */
  onBlockedClick?: (file: DriveFile) => void
  /** 파일별 sync 상태 */
  syncStatuses?: Record<string, SyncStatus | undefined>
}

export function FileList({
  files,
  loading,
  emptyMessage,
  cachedIds,
  online = true,
  onBlockedClick,
  syncStatuses,
}: Props): JSX.Element {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () => (q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files),
    [files, q]
  )

  function isBlocked(id: string): boolean {
    if (online) return false
    if (!cachedIds) return true
    return !cachedIds.has(id)
  }

  function handleClick(e: React.MouseEvent, file: DriveFile) {
    if (isBlocked(file.id)) {
      e.preventDefault()
      onBlockedClick?.(file)
      return
    }
    router.push(`/editor/${file.id}`)
  }

  return (
    <div className="file-list">
      <div className="file-list__search">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d={ICON_SEARCH} />
        </svg>
        <input
          type="search"
          placeholder="검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="file-list__items">
        {loading && filtered.length === 0 && (
          <div className="file-list__empty">로딩 중...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="file-list__empty">
            {q ? '검색 결과 없음' : (emptyMessage ?? '파일 없음')}
          </div>
        )}
        {filtered.map((f) => {
          const blocked = isBlocked(f.id)
          const conflict = isConflictName(f.name)
          const sync = syncStatuses?.[f.id]
          return (
            <a
              key={f.id}
              href={`/editor/${f.id}`}
              onClick={(e) => handleClick(e, f)}
              className={
                'file-list__row' +
                (conflict ? ' is-conflict' : '') +
                (blocked ? ' is-blocked' : '')
              }
              aria-disabled={blocked || undefined}
            >
              <div
                className={`file-list__ic ${isMd(f.name) ? 'is-md' : 'is-txt'}`}
                aria-hidden
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                >
                  <path d={isMd(f.name) ? ICON_FILE_TEXT : ICON_FILE} />
                </svg>
              </div>
              <div className="file-list__info">
                <div className="file-list__name">{f.name}</div>
                <div className="file-list__meta">
                  <span className="sn-badge sn-badge--cloud">클라우드</span>
                  {conflict && (
                    <span className="sn-badge sn-badge--conflict">⚠️ 충돌</span>
                  )}
                  <SyncStatusBadge status={sync} />
                  <span className="file-list__time">
                    {relativeTime(f.modifiedTime)}
                  </span>
                </div>
              </div>
              {blocked ? (
                <svg
                  className="file-list__lock"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                  aria-label="오프라인 — 열 수 없음"
                >
                  <path d={ICON_LOCK} />
                </svg>
              ) : (
                <svg
                  className="file-list__chevron"
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d={ICON_CHEVRON} />
                </svg>
              )}
            </a>
          )
        })}
      </div>

      <div className="file-list__footer-notice">
        로컬 파일은 데스크탑 앱에서만 지원됩니다
      </div>
    </div>
  )
}
