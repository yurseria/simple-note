// Design Ref: §5.4 — Files List (모바일 기준 1차, 데스크탑 사이드바 레이아웃은 장래 확장)
// Plan SC: FR-11, FR-16 (반응형), FR-20 (오프라인 배너), FR-21 (🔒 + 토스트)

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Moon, Sun, FolderPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FileList } from '../../../components/FileList'
import { OfflineBanner } from '../../../components/OfflineBanner'
import {
  deleteFile,
  getCachedFileIds,
  getCurrentUser,
  isAuthenticated,
  listFiles,
  listFolders,
  moveFileToFolder,
  readFile,
  signOut,
  createUserFolder,
} from '../../../lib/cloudApi'
import type { DriveFolder } from '../../../lib/cloudApi'
import type { DriveFile } from '@simple-note/renderer/types/api'
import { drainQueue, pendingStatusMap } from '../../../lib/syncQueue'
import type { SyncStatus } from '../../../lib/offlineCache'
import { useCloudState } from '../../../lib/useCloudState'
import { useNetworkStatus } from '../../../lib/useNetworkStatus'
import { useT } from '../../../lib/i18n'
import './files.css'

export default function FilesPage(): JSX.Element {
  const router = useRouter()
  const t = useT()
  const { user, files, loading, error, setUser, setFiles, setLoading, setError } =
    useCloudState()
  const { online } = useNetworkStatus()
  const [menuOpen, setMenuOpen] = useState(false)
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const [syncStatuses, setSyncStatuses] = useState<
    Record<string, SyncStatus | undefined>
  >({})
  const drainInFlight = useRef(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const newFolderInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('sn-theme') as 'dark' | 'light' | null
    if (saved) setTheme(saved)
  }, [])

  function toggleTheme(): void {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    localStorage.setItem('sn-theme', next)
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }, [])

  const refreshAll = useCallback(async () => {
    try {
      const [list, ids, pend] = await Promise.all([
        listFiles(),
        getCachedFileIds(),
        pendingStatusMap(),
      ])
      setFiles(list)
      setCachedIds(ids)
      setSyncStatuses(pend)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [setFiles, setError])

  const runDrain = useCallback(async () => {
    if (drainInFlight.current) return
    drainInFlight.current = true
    try {
      const result = await drainQueue()
      if (result.empty) return
      const conflicts = result.conflicts.length
      const synced = result.synced.length
      const failed = result.failed.length
      if (conflicts > 0) {
        const names = result.conflicts
          .map((c) => c.conflictFile.name)
          .join(', ')
        showToast(t.syncConflict(conflicts, names))
      } else if (synced > 0) {
        showToast(t.syncDone(synced))
      } else if (failed > 0) {
        showToast(t.syncFailed(failed))
      }
      await refreshAll()
    } finally {
      drainInFlight.current = false
    }
  }, [showToast, refreshAll, t])

  // 인증 가드 + 사용자/파일 로드 + 캐시 ID 조회
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/')
      return
    }
    const u = getCurrentUser()
    if (u) setUser(u)

    let cancelled = false
    setError(null)
    // 캐시 데이터가 없을 때만 로딩 스피너 표시
    if (useCloudState.getState().files.length === 0) setLoading(true)

    Promise.all([listFiles(), getCachedFileIds(), pendingStatusMap()])
      .then(([list, ids, pend]) => {
        if (cancelled) return
        setFiles(list)
        setCachedIds(ids)
        setSyncStatuses(pend)
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          list.slice(0, 5).forEach((f) => router.prefetch(`/editor/${f.id}`))
          list.slice(0, 3).forEach((f) => readFile(f.id).catch(() => {}))
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [router, setUser, setFiles, setLoading, setError])

  // 온라인 복귀 시 자동 drain
  useEffect(() => {
    if (!online) return
    if (!isAuthenticated()) return
    runDrain()
  }, [online, runDrain])

  async function handleLogout() {
    setMenuOpen(false)
    await signOut()
    router.replace('/')
  }

  function handleNew() {
    if (!online) {
      showToast(t.newDocOnlineOnly)
      return
    }
    router.push('/editor/new')
  }

  function handleNewFolderClick() {
    setNewFolderMode(true)
    setNewFolderName('')
    setTimeout(() => newFolderInputRef.current?.focus(), 50)
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim()
    setNewFolderMode(false)
    setNewFolderName('')
    if (!name) return
    try {
      const folder = await createUserFolder(name)
      useCloudState.getState().upsertFile(folder)
    } catch {
      showToast('폴더 생성 실패')
    }
  }

  const handleBlockedClick = useCallback(() => {
    showToast(t.onlineRequired)
  }, [showToast, t])

  const handleDelete = useCallback(async (file: DriveFile) => {
    if (!window.confirm(`"${file.name}" 파일을 삭제할까요?`)) return
    try {
      await deleteFile(file.id)
      useCloudState.getState().removeFile(file.id)
      showToast(`"${file.name}" 삭제됨`)
    } catch {
      showToast('삭제 실패')
    }
  }, [showToast])

  const handleMoveToFolder = useCallback(async (file: DriveFile, folder: DriveFolder) => {
    try {
      await moveFileToFolder(file.id, folder.id)
      useCloudState.getState().removeFile(file.id)
      showToast(`"${file.name}" → ${folder.name}`)
    } catch {
      showToast('이동 실패')
    }
  }, [showToast])

  return (
    <div className="files">
      <OfflineBanner />
      <nav className="files__nav">
        <div className="files__title">{t.myDocs}</div>
        <div className="files__nav-right">
          <button
            type="button"
            className="sn-icon-btn files__nav-btn"
            onClick={toggleTheme}
            aria-label={t.theme}
            title={t.theme}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            className="sn-icon-btn files__nav-btn"
            onClick={handleNewFolderClick}
            aria-label={t.newFolder}
            title={t.newFolder}
          >
            <FolderPlus size={18} />
          </button>
          <button
            type="button"
            className="sn-icon-btn files__nav-btn"
            onClick={handleNew}
            aria-label={t.newDoc}
            title={t.newDoc}
          >
            <Plus size={20} />
          </button>
          <div className="files__user">
            <button
              type="button"
              className="files__avatar"
              onClick={() => setMenuOpen((v) => !v)}
              title={user?.email ?? ''}
              aria-label={t.userMenu}
            >
              {user?.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.picture} alt={user.name ?? ''} />
              ) : (
                <span>{(user?.name?.[0] ?? 'U').toUpperCase()}</span>
              )}
            </button>
            {menuOpen && (
              <div
                className="files__user-menu"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <div className="files__user-info">
                  <div className="files__user-name">{user?.name}</div>
                  <div className="files__user-email">{user?.email}</div>
                </div>
                <button
                  type="button"
                  className="files__user-logout"
                  onClick={handleLogout}
                >
                  {t.logout}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {error && (
        <div className="files__error">
          {t.listLoadFailed(error)}
        </div>
      )}

      {newFolderMode && (
        <div className="files__new-folder">
          <input
            ref={newFolderInputRef}
            className="files__new-folder-input"
            placeholder={t.folderNamePlaceholder}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => void handleCreateFolder()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              else if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName('') }
            }}
          />
        </div>
      )}

      <FileList
        files={files}
        loading={loading && files.length === 0}
        cachedIds={cachedIds}
        online={online}
        onBlockedClick={handleBlockedClick}
        syncStatuses={syncStatuses}
        onDelete={handleDelete}
        onMoveToFolder={handleMoveToFolder}
        loadFolders={listFolders}
      />

      {toast && <div className="files__toast">{toast}</div>}
    </div>
  )
}
