// Design Ref: §5.4 PWA Files List — Page UI Checklist (모바일/데스크탑 공통)
// Plan SC: FR-11 (클라우드만 표시), FR-07 (검색), FR-21 (미캐시 🔒), FR-25 (⚠️ 뱃지)

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  RiMarkdownLine,
  RiFileTextLine,
  RiSearchLine,
  RiArrowRightSLine,
  RiLockLine,
  RiFolderLine,
  RiFolderOpenLine,
  RiDeleteBinLine,
} from '@remixicon/react'
import type { DriveFile } from '@simple-note/renderer/types/api'
import type { DriveFolder } from '../lib/cloudApi'
import type { SyncStatus } from '../lib/offlineCache'
import { useT, relativeTime } from '../lib/i18n'
import { SyncStatusBadge } from './SyncStatusBadge'
import './FileList.css'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

function isMd(name: string): boolean {
  const l = name.toLowerCase()
  return l.endsWith('.md') || l.endsWith('.markdown')
}

function isConflictName(name: string): boolean {
  return /\.conflict(?:-\d+)?\.(md|markdown|txt)$/i.test(name)
}

interface CtxMenu {
  file: DriveFile
  x: number
  y: number
}

interface Props {
  files: DriveFile[]
  loading?: boolean
  emptyMessage?: string
  cachedIds?: Set<string>
  online?: boolean
  onBlockedClick?: (file: DriveFile) => void
  syncStatuses?: Record<string, SyncStatus | undefined>
  onDelete?: (file: DriveFile) => void
  onMoveToFolder?: (file: DriveFile, folder: DriveFolder) => void
  loadFolders?: () => Promise<DriveFolder[]>
}

export function FileList({
  files,
  loading,
  emptyMessage,
  cachedIds,
  online = true,
  onBlockedClick,
  syncStatuses,
  onDelete,
  onMoveToFolder,
  loadFolders,
}: Props): JSX.Element {
  const t = useT()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const driveFolders = useMemo(() => files.filter((f) => f.mimeType === FOLDER_MIME), [files])
  const rootFiles = useMemo(
    () => files.filter((f) => f.mimeType !== FOLDER_MIME && !f.parentId),
    [files]
  )
  const subfilesByFolder = useMemo(() => {
    const map: Record<string, DriveFile[]> = {}
    files
      .filter((f) => f.mimeType !== FOLDER_MIME && !!f.parentId)
      .forEach((f) => {
        const pid = f.parentId!
        if (!map[pid]) map[pid] = []
        map[pid].push(f)
      })
    return map
  }, [files])

  // 검색 시: 폴더 구조 무시하고 파일만 flat으로 표시
  const searchResults = useMemo(
    () =>
      q
        ? files.filter((f) => f.mimeType !== FOLDER_MIME && f.name.toLowerCase().includes(q))
        : [],
    [files, q]
  )

  const isEmpty = !loading && driveFolders.length === 0 && rootFiles.length === 0
  const isSearchEmpty = q !== '' && searchResults.length === 0

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [ctx, setCtx] = useState<CtxMenu | null>(null)
  const [folderPicker, setFolderPicker] = useState<DriveFile | null>(null)
  const [folderPickerList, setFolderPickerList] = useState<DriveFolder[] | null>(null)
  const [foldersLoading, setFoldersLoading] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  const showActions = Boolean(onDelete || (onMoveToFolder && loadFolders))

  function toggleFolder(id: string): void {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearLongPress(): void {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handleTouchStart(e: React.TouchEvent, file: DriveFile): void {
    const touch = e.touches[0]
    const x = touch.clientX
    const y = touch.clientY
    longPressFired.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      longPressFired.current = true
      setCtx({ file, x, y })
    }, 500)
  }

  function handleTouchEnd(e: React.TouchEvent): void {
    const fired = longPressFired.current
    clearLongPress()
    longPressFired.current = false
    if (fired) {
      e.preventDefault()
    }
  }

  function handleContextMenu(e: React.MouseEvent, file: DriveFile): void {
    e.preventDefault()
    setCtx({ file, x: e.clientX, y: e.clientY })
  }

  function menuStyle(x: number, y: number): React.CSSProperties {
    const menuW = 192
    const menuH = 130
    return {
      left: Math.max(8, Math.min(x, window.innerWidth - menuW - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - menuH - 8)),
    }
  }

  async function handleMoveClick(): Promise<void> {
    if (!ctx || !loadFolders) return
    const file = ctx.file
    setCtx(null)
    setFolderPicker(file)
    setFolderPickerList(null)
    setFoldersLoading(true)
    try {
      setFolderPickerList(await loadFolders())
    } finally {
      setFoldersLoading(false)
    }
  }

  function handleDeleteClick(): void {
    if (!ctx) return
    const file = ctx.file
    setCtx(null)
    onDelete?.(file)
  }

  function handleFolderSelect(folder: DriveFolder): void {
    if (!folderPicker) return
    onMoveToFolder?.(folderPicker, folder)
    setFolderPicker(null)
    setFolderPickerList(null)
  }

  useEffect(() => {
    if (!ctx) return
    const handler = (): void => setCtx(null)
    window.addEventListener('scroll', handler, { passive: true, capture: true })
    return () => window.removeEventListener('scroll', handler, { capture: true })
  }, [ctx])

  function isBlocked(id: string): boolean {
    if (online) return false
    return !(cachedIds?.has(id) ?? false)
  }

  function handleClick(e: React.MouseEvent, file: DriveFile): void {
    e.preventDefault()
    if (isBlocked(file.id)) {
      onBlockedClick?.(file)
      return
    }
    router.push(`/editor/${file.id}`)
  }

  function renderFileRow(f: DriveFile, indented = false): JSX.Element {
    const blocked = isBlocked(f.id)
    const conflict = isConflictName(f.name)
    const sync = syncStatuses?.[f.id]
    return (
      <a
        key={f.id}
        href={`/editor/${f.id}`}
        onClick={(e) => handleClick(e, f)}
        onContextMenu={showActions ? (e) => handleContextMenu(e, f) : undefined}
        onTouchStart={showActions ? (e) => handleTouchStart(e, f) : undefined}
        onTouchEnd={showActions ? handleTouchEnd : undefined}
        onTouchMove={showActions ? clearLongPress : undefined}
        className={
          'file-list__row' +
          (indented ? ' file-list__row--indented' : '') +
          (conflict ? ' is-conflict' : '') +
          (blocked ? ' is-blocked' : '')
        }
        aria-disabled={blocked || undefined}
      >
        <div className={`file-list__ic ${isMd(f.name) ? 'is-md' : 'is-txt'}`} aria-hidden>
          {isMd(f.name) ? <RiMarkdownLine size={18} /> : <RiFileTextLine size={18} />}
        </div>
        <div className="file-list__info">
          <div className="file-list__name">{f.name}</div>
          <div className="file-list__meta">
            <span className="sn-badge sn-badge--cloud">{t.cloudBadge}</span>
            {conflict && (
              <span className="sn-badge sn-badge--conflict">{t.conflictBadge}</span>
            )}
            <SyncStatusBadge status={sync} />
            <span className="file-list__time">{relativeTime(f.modifiedTime, t)}</span>
          </div>
        </div>
        {blocked ? (
          <RiLockLine size={16} className="file-list__lock" aria-label={t.offlineBlocked} />
        ) : (
          <RiArrowRightSLine size={14} className="file-list__chevron" aria-hidden />
        )}
      </a>
    )
  }

  return (
    <div className="file-list">
      <div className="file-list__search">
        <RiSearchLine size={14} />
        <input
          type="search"
          placeholder={t.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="file-list__items">
        {loading && files.length === 0 && (
          <div className="file-list__empty">{t.loading}</div>
        )}
        {isEmpty && !q && (
          <div className="file-list__empty">{emptyMessage ?? t.empty}</div>
        )}
        {isSearchEmpty && (
          <div className="file-list__empty">{t.noResults}</div>
        )}

        {q ? (
          searchResults.map((f) => renderFileRow(f))
        ) : (
          <>
            {driveFolders.map((folder) => {
              const isExpanded = expandedFolders.has(folder.id)
              const subfiles = subfilesByFolder[folder.id] ?? []
              return (
                <div key={folder.id}>
                  <button
                    type="button"
                    className="file-list__folder-row"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    <div className="file-list__ic file-list__ic--folder" aria-hidden>
                      {isExpanded ? <RiFolderOpenLine size={18} /> : <RiFolderLine size={18} />}
                    </div>
                    <div className="file-list__info">
                      <div className="file-list__name">{folder.name}</div>
                    </div>
                    <RiArrowRightSLine
                      size={14}
                      className={`file-list__chevron${isExpanded ? ' is-expanded' : ''}`}
                      aria-hidden
                    />
                  </button>
                  {isExpanded && subfiles.map((f) => renderFileRow(f, true))}
                </div>
              )
            })}
            {rootFiles.map((f) => renderFileRow(f))}
          </>
        )}
      </div>

      <div className="file-list__footer-notice">
        {t.localOnly.split('\n').map((line, i) => (
          <span key={i}>{line}{i === 0 ? <br /> : null}</span>
        ))}
      </div>

      {/* 컨텍스트 메뉴 */}
      {ctx && (
        <>
          <div className="file-list__ctx-overlay" onClick={() => setCtx(null)} />
          <div className="file-list__ctx-menu" style={menuStyle(ctx.x, ctx.y)}>
            {onMoveToFolder && loadFolders && (
              <button type="button" className="file-list__ctx-item" onClick={() => void handleMoveClick()}>
                <RiFolderLine size={16} />
                폴더로 이동
              </button>
            )}
            {onDelete && onMoveToFolder && loadFolders && <div className="file-list__ctx-sep" />}
            {onDelete && (
              <button type="button" className="file-list__ctx-item is-danger" onClick={handleDeleteClick}>
                <RiDeleteBinLine size={16} />
                삭제
              </button>
            )}
          </div>
        </>
      )}

      {/* 폴더 이동 피커 */}
      {folderPicker && (
        <div className="file-list__modal-overlay" onClick={() => setFolderPicker(null)}>
          <div className="file-list__modal" onClick={(e) => e.stopPropagation()}>
            <div className="file-list__modal-header">
              <span className="file-list__modal-title">폴더로 이동</span>
              <button type="button" className="file-list__modal-close" onClick={() => setFolderPicker(null)}>×</button>
            </div>
            <div className="file-list__modal-list">
              {foldersLoading && <div className="file-list__modal-loading">폴더 불러오는 중…</div>}
              {!foldersLoading && folderPickerList?.length === 0 && (
                <div className="file-list__modal-empty">폴더가 없습니다</div>
              )}
              {folderPickerList?.map((folder) => (
                <button key={folder.id} type="button" className="file-list__modal-item" onClick={() => handleFolderSelect(folder)}>
                  <RiFolderLine size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
