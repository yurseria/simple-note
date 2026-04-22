// Design Ref: §5.3, §5.4, §5.5 — CloudSidebar
// Plan SC: FR-04 (클라우드 섹션), FR-05 (이 기기 섹션), FR-06 (파일 클릭 → 탭 열기), FR-07 (검색)
//
// DESIGN.md §4 CloudSidebar 스펙 준수:
//   width 220px, bg var(--gutter-bg), 검색 입력, 섹션 라벨 10px uppercase

import { useEffect, useMemo, useState } from 'react'
import { api } from '../../platform'
import { useCloudStore } from '../../store/cloudStore'
import { useTabStore, inferLanguage } from '../../store/tabStore'
import { useUIStore } from '../../store/uiStore'
import type { DriveFile } from '../../types/api'
import './CloudSidebar.css'

// ── Remix Icon paths (24×24 viewBox) ──
const ICON_FILE_TEXT =
  'M21 8v12.993A1 1 0 0 1 20.007 22H3.993A.993.993 0 0 1 3 21.008V2.992C3 2.444 3.445 2 3.993 2H14v7h7zm-2 0h-5V3H5v16h14V8zM8 12h8v2H8v-2zm0 4h8v2H8v-2zm0-8h3v2H8V8z'
const ICON_FILE =
  'M21 8v12.993A1 1 0 0 1 20.007 22H3.993A.993.993 0 0 1 3 21.008V2.992C3 2.444 3.445 2 3.993 2H14v7h7zm-2 0h-5V3H5v16h14V8z'
const ICON_SEARCH =
  'M18.031 16.617l4.283 4.282-1.415 1.415-4.282-4.283A8.96 8.96 0 0 1 11 20c-4.968 0-9-4.032-9-9s4.032-9 9-9 9 4.032 9 9a8.96 8.96 0 0 1-1.969 5.617zm-2.006-.742A6.977 6.977 0 0 0 18 11c0-3.867-3.133-7-7-7-3.867 0-7 3.133-7 7 0 3.867 3.133 7 7 7a6.977 6.977 0 0 0 4.875-1.975l.15-.15z'
const ICON_PLUS =
  'M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z'
const ICON_CLOUD =
  'M17 21H7A6 6 0 0 1 5.08 9.31a8.001 8.001 0 0 1 15.84 0A6.002 6.002 0 0 1 19 21h-2zM12 4a6 6 0 0 0-5.982 5.59L6.1 10.88l-1.318.34a4.002 4.002 0 0 0 .838 7.76L6 19h11l.381-.02a4.001 4.001 0 0 0 .838-7.758l-1.318-.342-.082-1.29A6.001 6.001 0 0 0 12 4z'

function pickMimeFromName(name: string): 'markdown' | 'plaintext' {
  const lower = name.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.markdown') ? 'markdown' : 'plaintext'
}

export function CloudSidebar(): JSX.Element | null {
  const cloud = api.cloud
  const { sidebarOpen, sidebarWidth } = useUIStore()
  const { user, files, loading, setFiles, setLoading, setError } = useCloudStore()
  const tabs = useTabStore((s) => s.tabs)
  const activeId = useTabStore((s) => s.activeId)
  const addTab = useTabStore((s) => s.addTab)
  const setActive = useTabStore((s) => s.setActive)

  const [query, setQuery] = useState('')
  const [opening, setOpening] = useState<string | null>(null)

  // 로그인된 직후 + files 가 아직 비어있으면 1회 자동 로드
  useEffect(() => {
    if (!cloud || !user || loading || files.length > 0) return
    let cancelled = false
    setLoading(true)
    cloud
      .listFiles()
      .then((list) => {
        if (!cancelled) setFiles(list)
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
  }, [cloud, user, loading, files.length, setFiles, setLoading, setError])

  // "이 기기" 섹션 = 현재 열린 탭 중 로컬 파일 (filePath 있고 cloudFileId 없음)
  const localTabs = useMemo(
    () => tabs.filter((t) => t.filePath && !t.cloudFileId),
    [tabs]
  )

  // 검색 필터링 (이름 대소문자 무시)
  const q = query.trim().toLowerCase()
  const filteredFiles = useMemo(
    () => (q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files),
    [files, q]
  )
  const filteredLocal = useMemo(
    () =>
      q
        ? localTabs.filter((t) => t.fileName.toLowerCase().includes(q))
        : localTabs,
    [localTabs, q]
  )

  async function handleClickCloud(file: DriveFile): Promise<void> {
    if (!cloud || opening === file.id) return
    // 이미 열린 탭이면 activate
    const existing = tabs.find((t) => t.cloudFileId === file.id)
    if (existing) {
      setActive(existing.id)
      return
    }
    setOpening(file.id)
    try {
      const content = await cloud.readFile(file.id)
      const language = pickMimeFromName(file.name)
      addTab({
        fileName: file.name,
        content,
        language,
        filePath: null,
        cloudFileId: file.id,
        showPreview: language === 'markdown',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOpening(null)
    }
  }

  function handleClickLocal(tabId: string): void {
    setActive(tabId)
  }

  function handleNewFile(): void {
    addTab()
  }

  if (!sidebarOpen) {
    return <div className="cloud-sidebar cloud-sidebar--closed" aria-hidden />
  }

  return (
    <aside
      className="cloud-sidebar"
      style={{ width: sidebarWidth }}
      aria-label="문서 사이드바"
    >
      <div className="cloud-sidebar__header">
        <span className="cloud-sidebar__header-title">문서</span>
        <button
          type="button"
          className="cloud-sidebar__add"
          onClick={handleNewFile}
          title="새 파일"
          aria-label="새 파일"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d={ICON_PLUS} />
          </svg>
        </button>
      </div>

      <div className="cloud-sidebar__search">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
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

      <div className="cloud-sidebar__list">
        {cloud && user && (
          <>
            <div className="cloud-sidebar__sec">클라우드</div>
            {loading && filteredFiles.length === 0 && (
              <div className="cloud-sidebar__empty">로딩 중...</div>
            )}
            {!loading && filteredFiles.length === 0 && (
              <div className="cloud-sidebar__empty">
                {q ? '검색 결과 없음' : '파일 없음'}
              </div>
            )}
            {filteredFiles.map((f) => {
              const activeTab = tabs.find((t) => t.id === activeId)
              const isActive = activeTab?.cloudFileId === f.id
              const isOpening = opening === f.id
              const lang = pickMimeFromName(f.name)
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`cloud-sidebar__file${isActive ? ' is-active' : ''}`}
                  onClick={() => handleClickCloud(f)}
                  disabled={isOpening}
                  title={f.name}
                >
                  <svg
                    className="cloud-sidebar__file-icon"
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="currentColor"
                  >
                    <path d={lang === 'markdown' ? ICON_FILE_TEXT : ICON_FILE} />
                  </svg>
                  <span className="cloud-sidebar__file-name">{f.name}</span>
                  <svg
                    className="cloud-sidebar__file-badge cloud-sidebar__file-badge--cloud"
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
                    fill="currentColor"
                    aria-label="클라우드"
                  >
                    <path d={ICON_CLOUD} />
                  </svg>
                </button>
              )
            })}
          </>
        )}

        {(!cloud || !user) && (
          <div className="cloud-sidebar__empty">클라우드 로그인 필요</div>
        )}

        {filteredLocal.length > 0 && (
          <>
            <div className="cloud-sidebar__sec cloud-sidebar__sec--second">
              이 기기
            </div>
            {filteredLocal.map((t) => {
              const isActive = t.id === activeId
              const lang = inferLanguage(t.filePath)
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`cloud-sidebar__file${isActive ? ' is-active' : ''}`}
                  onClick={() => handleClickLocal(t.id)}
                  title={t.filePath ?? t.fileName}
                >
                  <svg
                    className="cloud-sidebar__file-icon"
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="currentColor"
                  >
                    <path
                      d={lang === 'markdown' ? ICON_FILE_TEXT : ICON_FILE}
                    />
                  </svg>
                  <span className="cloud-sidebar__file-name">
                    {t.fileName}
                  </span>
                  <span className="cloud-sidebar__file-badge cloud-sidebar__file-badge--local">
                    로컬
                  </span>
                </button>
              )
            })}
          </>
        )}
      </div>
    </aside>
  )
}
