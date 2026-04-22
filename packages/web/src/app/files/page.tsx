// Design Ref: §5.4 — Files List (모바일 기준 1차, 데스크탑 사이드바 레이아웃은 장래 확장)
// Plan SC: FR-11, FR-16 (반응형), FR-20 (오프라인 배너), FR-21 (🔒 + 토스트)

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileList } from '../../components/FileList'
import { OfflineBanner } from '../../components/OfflineBanner'
import {
  getCachedFileIds,
  getCurrentUser,
  isAuthenticated,
  listFiles,
  signOut,
} from '../../lib/cloudApi'
import { drainQueue, pendingStatusMap } from '../../lib/syncQueue'
import type { SyncStatus } from '../../lib/offlineCache'
import { useCloudState } from '../../lib/useCloudState'
import { useNetworkStatus } from '../../lib/useNetworkStatus'
import './files.css'

const ICON_PLUS = 'M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z'

export default function FilesPage(): JSX.Element {
  const router = useRouter()
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
        showToast(
          `충돌 ${conflicts}건 — 서버 버전을 ${names} 로 보관했습니다`
        )
      } else if (synced > 0) {
        showToast(`${synced}개 동기화 완료`)
      } else if (failed > 0) {
        showToast(`${failed}개 동기화 실패 — 잠시 후 다시 시도합니다`)
      }
      await refreshAll()
    } finally {
      drainInFlight.current = false
    }
  }, [showToast, refreshAll])

  // 인증 가드 + 사용자/파일 로드 + 캐시 ID 조회
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/')
      return
    }
    const u = getCurrentUser()
    if (u) setUser(u)

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([listFiles(), getCachedFileIds(), pendingStatusMap()])
      .then(([list, ids, pend]) => {
        if (cancelled) return
        setFiles(list)
        setCachedIds(ids)
        setSyncStatuses(pend)
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
      showToast('새 문서는 온라인에서만 만들 수 있습니다')
      return
    }
    router.push('/editor/new')
  }

  const handleBlockedClick = useCallback(() => {
    showToast('온라인 연결이 필요합니다')
  }, [showToast])

  return (
    <div className="files">
      <OfflineBanner />
      <nav className="files__nav">
        <div className="files__title">내 문서</div>
        <div className="files__nav-right">
          <button
            type="button"
            className="sn-icon-btn files__nav-btn"
            onClick={handleNew}
            aria-label="새 문서"
            title="새 문서"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path d={ICON_PLUS} />
            </svg>
          </button>
          <div className="files__user">
            <button
              type="button"
              className="files__avatar"
              onClick={() => setMenuOpen((v) => !v)}
              title={user?.email ?? ''}
              aria-label="유저 메뉴"
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
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {error && (
        <div className="files__error">
          목록 로드 실패: {error}
        </div>
      )}

      <FileList
        files={files}
        loading={loading}
        cachedIds={cachedIds}
        online={online}
        onBlockedClick={handleBlockedClick}
        syncStatuses={syncStatuses}
      />

      {toast && <div className="files__toast">{toast}</div>}
    </div>
  )
}
