'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  RiCloseLine,
  RiEditLine,
  RiFileTextLine,
  RiFocus3Line,
  RiFolderAddLine,
  RiFolderLine,
  RiFolderOpenLine,
  RiFullscreenLine,
  RiGlobalLine,
  RiLayoutBottom2Line,
  RiLayoutLeftLine,
  RiLoopRightLine,
  RiMarkdownLine,
  RiMoonLine,
  RiSettings3Line,
  RiSidebarFoldLine,
  RiSidebarUnfoldLine,
  RiSunLine,
} from '@remixicon/react'
import { useCloudState } from '../../lib/useCloudState'
import { useWebTabStore } from '../../lib/webTabStore'
import { useT } from '../../lib/i18n'
import { getCurrentUser, getCachedFilesList, isAuthenticated, listFiles, renameFile, signOut, createUserFolder, moveFile, getRootFolderId } from '../../lib/cloudApi'
import type { DriveFile } from '@simple-note/renderer/types/api'
import { DRIVE_MIME } from '@simple-note/renderer/domain/driveFolder'
import './layout.css'

function isMd(name: string): boolean {
  const l = name.toLowerCase()
  return l.endsWith('.md') || l.endsWith('.markdown')
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const router = useRouter()
  const params = useParams()
  const activeFileId = params?.fileId as string | undefined
  const { user, files, setUser, setFiles, upsertFile, online } = useCloudState()
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)

  const { tabs, activeId, closeTab, setActive, nextNewId, updateTabName, uiLang, setUiLang } = useWebTabStore()
  const t = useT()
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [hudMode, setHudMode] = useState<'statusbar' | 'hud'>('statusbar')
  const [hudStats, setHudStats] = useState<{ isMarkdown: boolean; chars: number; words: number; lines: number } | null>(null)
  const [zenMode, setZenMode] = useState(false)
  const [editorMode, setEditorMode] = useState<'auto' | 'md' | 'txt'>('auto')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const [saveBtnState, setSaveBtnState] = useState<'clean' | 'dirty' | 'saving'>('clean')
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingTabName, setEditingTabName] = useState('')
  const tabInputRef = useRef<HTMLInputElement>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const newFolderInputRef = useRef<HTMLInputElement>(null)
  const draggingFileRef = useRef<{ id: string; parentId?: string } | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null) // folderId or 'root'
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renamingName, setRenamingName] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Pull-to-refresh
  const workspaceRef = useRef<HTMLDivElement>(null)
  const touchStartYRef = useRef(0)
  const isPullingRef = useRef(false)
  const pullCurrentY = useRef(0)
  const isRefreshingRef = useRef(false)
  const [ptrY, setPtrY] = useState(-40)
  const [ptrOpacity, setPtrOpacity] = useState(0)
  const [ptrSpinning, setPtrSpinning] = useState(false)
  const [ptrTransition, setPtrTransition] = useState(false)

  useEffect(() => {
    if (!settingsOpen) return
    function onDocClick(e: MouseEvent): void {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [settingsOpen])

  useEffect(() => {
    const saved = localStorage.getItem('sn-theme') as 'dark' | 'light' | null
    if (saved && saved !== theme) {
      setTheme(saved)
      document.documentElement.dataset.theme = saved
    }
    const u = getCurrentUser()
    if (u) setUser(u)
    if (isAuthenticated()) {
      // stale-while-revalidate: 캐시 즉시 표시 후 네트워크로 갱신
      getCachedFilesList().then((cached) => {
        if (cached.length > 0) setFiles(cached)
      })
      listFiles().then(setFiles).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleTheme(): void {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    localStorage.setItem('sn-theme', next)
  }

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('note:set-editor-mode', { detail: editorMode }))
  }, [editorMode])

  useEffect(() => {
    function onHudUpdate(e: Event): void {
      setHudStats((e as CustomEvent<{ isMarkdown: boolean; chars: number; words: number; lines: number }>).detail)
    }
    window.addEventListener('note:hud-update', onHudUpdate)
    return () => window.removeEventListener('note:hud-update', onHudUpdate)
  }, [])

  useEffect(() => {
    function onSaveState(e: Event): void {
      const { isDirty, saving } = (e as CustomEvent<{ isDirty: boolean; saving: boolean }>).detail
      setSaveBtnState(saving ? 'saving' : isDirty ? 'dirty' : 'clean')
    }
    window.addEventListener('note:save-state', onSaveState)
    return () => window.removeEventListener('note:save-state', onSaveState)
  }, [])

  useEffect(() => {
    const el = workspaceRef.current
    if (!el || !('ontouchstart' in window)) return

    const THRESHOLD = 72

    function isTouchAtTop(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) return true
      let node: Element | null = target
      while (node && node !== el) {
        if (node.scrollTop > 0) return false
        node = node.parentElement
      }
      return true
    }

    function onTouchStart(e: TouchEvent): void {
      if (isRefreshingRef.current) return
      if (!isTouchAtTop(e.target)) return
      touchStartYRef.current = e.touches[0].pageY
      isPullingRef.current = true
      pullCurrentY.current = 0
      setPtrTransition(false)
    }

    function onTouchMove(e: TouchEvent): void {
      if (!isPullingRef.current || isRefreshingRef.current) return
      const dy = e.touches[0].pageY - touchStartYRef.current
      if (dy <= 0) {
        isPullingRef.current = false
        pullCurrentY.current = 0
        setPtrY(-40)
        setPtrOpacity(0)
        return
      }
      const damped = Math.min(dy * 0.45, THRESHOLD * 1.2)
      pullCurrentY.current = damped
      setPtrY(damped - 40)
      setPtrOpacity(Math.min(damped / THRESHOLD, 1))
    }

    function onTouchEnd(): void {
      if (!isPullingRef.current) return
      isPullingRef.current = false
      setPtrTransition(true)
      if (pullCurrentY.current >= THRESHOLD * 0.8) {
        isRefreshingRef.current = true
        setPtrSpinning(true)
        setPtrY(20)
        setPtrOpacity(1)
        setTimeout(() => window.location.reload(), 600)
      } else {
        setPtrY(-40)
        setPtrOpacity(0)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  function handleSidebarResizeMouseDown(e: React.MouseEvent): void {
    e.preventDefault()
    function onMove(ev: MouseEvent): void {
      setSidebarWidth(Math.max(120, Math.min(400, ev.clientX)))
    }
    function onUp(): void {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return files.filter((f: DriveFile) => f.mimeType !== DRIVE_MIME.FOLDER && f.name.toLowerCase().includes(q))
  }, [files, search])

  const folders = useMemo(() => files.filter((f) => f.mimeType === DRIVE_MIME.FOLDER), [files])
  const rootFiles = useMemo(() => files.filter((f) => f.mimeType !== DRIVE_MIME.FOLDER && !f.parentId), [files])
  const subfilesByFolder = useMemo(() => {
    const map: Record<string, DriveFile[]> = {}
    files.filter((f) => f.mimeType !== DRIVE_MIME.FOLDER && !!f.parentId).forEach((f) => {
      const pid = f.parentId!
      if (!map[pid]) map[pid] = []
      map[pid].push(f)
    })
    return map
  }, [files])

  useEffect(() => {
    if (editingTabId) tabInputRef.current?.select()
  }, [editingTabId])

  useEffect(() => {
    if (newFolderMode) newFolderInputRef.current?.focus()
  }, [newFolderMode])

  useEffect(() => {
    if (renamingId) renameInputRef.current?.select()
  }, [renamingId])

  // Auto-expand the folder containing the active file
  useEffect(() => {
    if (!activeFileId) return
    const file = files.find((f) => f.id === activeFileId)
    if (file?.parentId) {
      setExpandedFolders((prev) => {
        if (prev.has(file.parentId!)) return prev
        const next = new Set(prev)
        next.add(file.parentId!)
        return next
      })
    }
  }, [activeFileId, files])

  function toggleFolder(id: string): void {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDragStart(e: React.DragEvent, file: DriveFile): void {
    draggingFileRef.current = { id: file.id, parentId: file.parentId }
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd(): void {
    draggingFileRef.current = null
    setDragOverTarget(null)
  }

  function handleDragOver(e: React.DragEvent, target: string): void {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverTarget !== target) setDragOverTarget(target)
  }

  async function handleDrop(e: React.DragEvent, target: string): Promise<void> {
    e.preventDefault()
    setDragOverTarget(null)
    const dragging = draggingFileRef.current
    draggingFileRef.current = null
    if (!dragging) return

    const rootFolderId = getRootFolderId()
    const newParentId = target === 'root' ? rootFolderId : target
    if (!newParentId) return

    // No-op: already in target
    const isMovingToRoot = target === 'root'
    if (isMovingToRoot && !dragging.parentId) return
    if (!isMovingToRoot && dragging.parentId === target) return

    const draggedFile = files.find((f) => f.id === dragging.id)
    if (!draggedFile) return

    try {
      await moveFile(dragging.id, newParentId, dragging.parentId)
      upsertFile({ ...draggedFile, parentId: isMovingToRoot ? undefined : newParentId })
      // Auto-expand target folder
      if (!isMovingToRoot) {
        setExpandedFolders((prev) => new Set(prev).add(target))
      }
    } catch {
      // best effort
    }
  }

  async function handleSidebarRename(id: string, newName: string): Promise<void> {
    const trimmed = newName.trim()
    setRenamingId(null)
    const item = files.find((f) => f.id === id)
    if (!item || !trimmed || trimmed === item.name) return
    upsertFile({ ...item, name: trimmed })
    try {
      await renameFile(id, trimmed)
      if (item.mimeType !== DRIVE_MIME.FOLDER) {
        window.dispatchEvent(new CustomEvent('note:file-renamed', { detail: { fileId: id, name: trimmed } }))
      }
    } catch {
      upsertFile(item)
    }
  }

  async function handleCreateFolder(): Promise<void> {
    const name = newFolderName.trim()
    setNewFolderMode(false)
    setNewFolderName('')
    if (!name) return
    try {
      const folder = await createUserFolder(name)
      upsertFile(folder)
      setExpandedFolders((prev) => new Set(prev).add(folder.id))
    } catch {
      // best effort
    }
  }

  async function handleTabRename(tabId: string, newName: string): Promise<void> {
    const trimmed = newName.trim()
    setEditingTabId(null)
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab || !trimmed || trimmed === tab.name) return
    updateTabName(tabId, trimmed)
    if (/^new(-\d+)?$/.test(tabId)) return
    try {
      await renameFile(tabId, trimmed)
      window.dispatchEvent(new CustomEvent('note:file-renamed', { detail: { fileId: tabId, name: trimmed } }))
    } catch {
      updateTabName(tabId, tab.name)
    }
  }

  function handleSave(): void {
    window.dispatchEvent(new CustomEvent('note:request-save'))
  }

  async function handleLogout(): Promise<void> {
    await signOut()
    router.replace('/')
  }

  function handleTabClose(id: string, e: React.MouseEvent): void {
    e.stopPropagation()
    if (id === activeId && saveBtnState === 'dirty') {
      if (!window.confirm(t.unsavedTabClose)) return
    }
    const nextId = closeTab(id)
    if (nextId) {
      router.push(`/editor/${nextId}`)
    } else {
      router.push('/files')
    }
  }

  const initials = user?.name?.slice(0, 1).toUpperCase() ?? '?'

  return (
    <div ref={workspaceRef} className={`workspace${zenMode ? ' is-zen' : ''}${hudMode === 'hud' ? ' is-hud-mode' : ''}`}>
      {/* Pull-to-refresh indicator (mobile only) */}
      <div
        className="workspace__ptr-wrap"
        style={{
          transform: `translateX(-50%) translateY(${ptrY}px)`,
          opacity: ptrOpacity,
          transition: ptrTransition ? 'transform 0.3s ease, opacity 0.25s ease' : 'none',
        }}
        aria-hidden="true"
      >
        <div className="workspace__ptr">
          <RiLoopRightLine
            size={20}
            className={`workspace__ptr-icon${ptrSpinning ? ' is-spinning' : ''}`}
            style={ptrSpinning ? undefined : { transform: `rotate(${Math.round(ptrOpacity * 360)}deg)` }}
          />
        </div>
      </div>
      {/* ── 데스크탑 탭바 ── */}
      <div className="workspace__tabbar">
        <div className="workspace__tabbar-left">
          <button
            type="button"
            className="workspace__sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            title="사이드바 접기/펼치기"
            aria-label="사이드바 접기/펼치기"
          >
            {sidebarOpen ? <RiSidebarFoldLine size={16} /> : <RiSidebarUnfoldLine size={16} />}
          </button>
        </div>

        <div className="workspace__tabs-scroll">
          {tabs.map((tab) =>
            editingTabId === tab.id ? (
              <div
                key={tab.id}
                className={`workspace__tab${tab.id === activeId ? ' is-active' : ''}`}
              >
                <input
                  ref={tabInputRef}
                  className="workspace__tab-input"
                  value={editingTabName}
                  onChange={(e) => setEditingTabName(e.target.value)}
                  onBlur={() => void handleTabRename(tab.id, editingTabName)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    else if (e.key === 'Escape') setEditingTabId(null)
                  }}
                />
              </div>
            ) : (
              <button
                key={tab.id}
                type="button"
                className={`workspace__tab${tab.id === activeId ? ' is-active' : ''}`}
                onClick={() => {
                  setActive(tab.id)
                  router.push(`/editor/${tab.id}`)
                }}
                onDoubleClick={() => {
                  setEditingTabName(tab.name)
                  setEditingTabId(tab.id)
                }}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    e.preventDefault()
                    handleTabClose(tab.id, e)
                  }
                }}
              >
                <span className="workspace__tab-name">{tab.name}</span>
                <span
                  className="workspace__tab-close"
                  onClick={(e) => handleTabClose(tab.id, e)}
                  role="button"
                  tabIndex={-1}
                  aria-label="탭 닫기"
                >
                  ×
                </span>
              </button>
            )
          )}
        </div>

        <div className="workspace__tabbar-right">
          <button
            type="button"
            className="workspace__tab-add"
            onClick={() => {
              const id = nextNewId()
              router.push(`/editor/${id}`)
            }}
            aria-label={t.newDoc}
            title={t.newDoc}
          >
            +
          </button>
          {activeFileId && (
            <button
              type="button"
              className={`workspace__save-btn workspace__save-btn--${saveBtnState}`}
              onClick={handleSave}
              disabled={saveBtnState !== 'dirty'}
            >
              {saveBtnState === 'saving' ? t.saving : saveBtnState === 'clean' ? `✓ ${t.saved}` : t.save}
            </button>
          )}
          {user && (
            <div className="workspace__user">
              <button
                type="button"
                className="workspace__avatar"
                onClick={() => setAvatarMenuOpen((v) => !v)}
                title={user.name}
                aria-label={t.userMenu}
              >
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
                ) : (
                  initials
                )}
              </button>
              {avatarMenuOpen && (
                <div
                  className="workspace__user-menu"
                  onMouseLeave={() => setAvatarMenuOpen(false)}
                >
                  <div className="workspace__user-info">
                    <div className="workspace__user-name">{user.name}</div>
                    <div className="workspace__user-email">{user.email}</div>
                  </div>
                  <button
                    type="button"
                    className="workspace__user-logout"
                    onClick={handleLogout}
                  >
                    {t.logout}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 바디 ── */}
      <div className="workspace__body">
        {/* 사이드바 (데스크탑 전용) */}
        <aside
          className={`workspace__sidebar${sidebarOpen ? '' : ' is-hidden'}`}
          style={sidebarOpen ? { width: sidebarWidth } : undefined}
        >
          <div className="workspace__sidebar-header">
            <span className="workspace__sidebar-title">{t.docs}</span>
            <div className="workspace__sidebar-header-actions">
              <button
                type="button"
                className="workspace__sidebar-new-folder"
                onClick={() => setNewFolderMode(true)}
                aria-label={t.newFolder}
                title={t.newFolder}
              >
                <RiFolderAddLine size={14} />
              </button>
              <button
                type="button"
                className="workspace__sidebar-new"
                onClick={() => router.push(`/editor/${nextNewId()}`)}
                aria-label={t.newDoc}
                title={t.newDoc}
              >
                +
              </button>
            </div>
          </div>

          <div className="workspace__sidebar-search">
            <input
              type="search"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* 저장 안 됨 — 새 탭 (ID: new / new-N) */}
          {tabs.filter((tab) => /^new(-\d+)?$/.test(tab.id)).length > 0 && (
            <>
              <div className="workspace__sidebar-section">{t.unsaved}</div>
              <div className="workspace__sidebar-list">
                {tabs
                  .filter((tab) => /^new(-\d+)?$/.test(tab.id))
                  .map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`workspace__sidebar-item${tab.id === activeFileId ? ' is-active' : ''}`}
                      onClick={() => router.push(`/editor/${tab.id}`)}
                      title={tab.name}
                    >
                      <RiFileTextLine size={14} />
                      <span className="workspace__sidebar-item-name">{tab.name}</span>
                    </button>
                  ))}
              </div>
            </>
          )}

          <div
            className={`workspace__sidebar-section${dragOverTarget === 'root' ? ' is-drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'root')}
            onDragLeave={(e) => {
              if (!(e.currentTarget as Node).contains(e.relatedTarget as Node)) setDragOverTarget(null)
            }}
            onDrop={(e) => void handleDrop(e, 'root')}
          >
            {dragOverTarget === 'root' ? '⬆ ' + t.cloud : t.cloud}
          </div>

          <div className="workspace__sidebar-list">
            {search.trim() ? (
              filteredFiles.length === 0 ? (
                <div className="workspace__sidebar-empty">{t.noResults}</div>
              ) : (
                filteredFiles.map((file: DriveFile) => (
                  <button
                    key={file.id}
                    type="button"
                    className={`workspace__sidebar-item${file.id === activeFileId ? ' is-active' : ''}`}
                    onClick={() => router.push(`/editor/${file.id}`)}
                    onMouseDown={(e) => {
                      if (e.button === 1) {
                        e.preventDefault()
                        if (tabs.some((t) => t.id === file.id)) handleTabClose(file.id, e)
                      }
                    }}
                    title={file.name}
                  >
                    {isMd(file.name) ? <RiMarkdownLine size={14} /> : <RiFileTextLine size={14} />}
                    <span className="workspace__sidebar-item-name">{file.name}</span>
                  </button>
                ))
              )
            ) : (
              <>
                {newFolderMode && (
                  <div className="workspace__sidebar-folder-new">
                    <input
                      ref={newFolderInputRef}
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
                {folders.length === 0 && rootFiles.length === 0 && !newFolderMode && (
                  <div className="workspace__sidebar-empty">{t.empty}</div>
                )}
                {folders.map((folder) => {
                  const isExpanded = expandedFolders.has(folder.id)
                  const subfiles = subfilesByFolder[folder.id] ?? []
                  return (
                    <div key={folder.id}>
                      <div
                        className={`workspace__sidebar-folder-row${dragOverTarget === folder.id ? ' is-drag-over' : ''}`}
                        onDragOver={(e) => handleDragOver(e, folder.id)}
                        onDragLeave={(e) => {
                          if (!(e.currentTarget as Node).contains(e.relatedTarget as Node)) setDragOverTarget(null)
                        }}
                        onDrop={(e) => void handleDrop(e, folder.id)}
                      >
                        {renamingId === folder.id ? (
                          <div className="workspace__sidebar-folder-btn">
                            {isExpanded ? <RiFolderOpenLine size={14} /> : <RiFolderLine size={14} />}
                            <input
                              ref={renameInputRef}
                              className="workspace__sidebar-rename-input"
                              value={renamingName}
                              onChange={(e) => setRenamingName(e.target.value)}
                              onBlur={() => void handleSidebarRename(folder.id, renamingName)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur()
                                else if (e.key === 'Escape') setRenamingId(null)
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="workspace__sidebar-folder-btn"
                            onClick={() => toggleFolder(folder.id)}
                            onDoubleClick={(e) => { e.stopPropagation(); setRenamingName(folder.name); setRenamingId(folder.id) }}
                            title={folder.name}
                          >
                            {isExpanded ? <RiFolderOpenLine size={14} /> : <RiFolderLine size={14} />}
                            <span className="workspace__sidebar-item-name">{folder.name}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="workspace__sidebar-folder-add"
                          onClick={() => router.push(`/editor/${nextNewId()}?folderId=${folder.id}`)}
                          title={t.newDoc}
                        >
                          +
                        </button>
                      </div>
                      {isExpanded && subfiles.map((file) =>
                        renamingId === file.id ? (
                          <div
                            key={file.id}
                            className={`workspace__sidebar-item workspace__sidebar-item--indented${file.id === activeFileId ? ' is-active' : ''}`}
                          >
                            {isMd(file.name) ? <RiMarkdownLine size={14} /> : <RiFileTextLine size={14} />}
                            <input
                              ref={renameInputRef}
                              className="workspace__sidebar-rename-input"
                              value={renamingName}
                              onChange={(e) => setRenamingName(e.target.value)}
                              onBlur={() => void handleSidebarRename(file.id, renamingName)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur()
                                else if (e.key === 'Escape') setRenamingId(null)
                              }}
                            />
                          </div>
                        ) : (
                          <button
                            key={file.id}
                            type="button"
                            draggable
                            className={`workspace__sidebar-item workspace__sidebar-item--indented${file.id === activeFileId ? ' is-active' : ''}${draggingFileRef.current?.id === file.id ? ' is-dragging' : ''}`}
                            onClick={() => router.push(`/editor/${file.id}`)}
                            onDoubleClick={() => { setRenamingName(file.name); setRenamingId(file.id) }}
                            onMouseDown={(e) => {
                              if (e.button === 1) {
                                e.preventDefault()
                                if (tabs.some((t) => t.id === file.id)) handleTabClose(file.id, e)
                              }
                            }}
                            onDragStart={(e) => handleDragStart(e, file)}
                            onDragEnd={handleDragEnd}
                            title={file.name}
                          >
                            {isMd(file.name) ? <RiMarkdownLine size={14} /> : <RiFileTextLine size={14} />}
                            <span className="workspace__sidebar-item-name">{file.name}</span>
                          </button>
                        )
                      )}
                    </div>
                  )
                })}
                {rootFiles.map((file: DriveFile) =>
                  renamingId === file.id ? (
                    <div
                      key={file.id}
                      className={`workspace__sidebar-item${file.id === activeFileId ? ' is-active' : ''}`}
                    >
                      {isMd(file.name) ? <RiMarkdownLine size={14} /> : <RiFileTextLine size={14} />}
                      <input
                        ref={renameInputRef}
                        className="workspace__sidebar-rename-input"
                        value={renamingName}
                        onChange={(e) => setRenamingName(e.target.value)}
                        onBlur={() => void handleSidebarRename(file.id, renamingName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                          else if (e.key === 'Escape') setRenamingId(null)
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      key={file.id}
                      type="button"
                      draggable
                      className={`workspace__sidebar-item${file.id === activeFileId ? ' is-active' : ''}${draggingFileRef.current?.id === file.id ? ' is-dragging' : ''}`}
                      onClick={() => router.push(`/editor/${file.id}`)}
                      onDoubleClick={() => { setRenamingName(file.name); setRenamingId(file.id) }}
                      onMouseDown={(e) => {
                        if (e.button === 1) {
                          e.preventDefault()
                          if (tabs.some((t) => t.id === file.id)) handleTabClose(file.id, e)
                        }
                      }}
                      onDragStart={(e) => handleDragStart(e, file)}
                      onDragEnd={handleDragEnd}
                      title={file.name}
                    >
                      {isMd(file.name) ? <RiMarkdownLine size={14} /> : <RiFileTextLine size={14} />}
                      <span className="workspace__sidebar-item-name">{file.name}</span>
                    </button>
                  )
                )}
              </>
            )}
          </div>

          <div className="workspace__sidebar-footer">
            {t.localOnly.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 ? <br /> : null}</span>
            ))}
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="workspace__sidebar-resizer"
            onMouseDown={handleSidebarResizeMouseDown}
          />
        )}
        <main className="workspace__content">
          {children}
          {hudMode === 'hud' && hudStats && (
            <div className="workspace__hud">
              <span>{[t.hudChar(hudStats.chars), t.hudWord(hudStats.words), t.hudLine(hudStats.lines)].join(' · ')}</span>
              <span className="workspace__hud-sep">·</span>
              <span>UTF-8</span>
              <span className="workspace__hud-sep">·</span>
              <span>{hudStats.isMarkdown ? 'Markdown' : t.plainText}</span>
              <span className="workspace__hud-sep">·</span>
              <span>{online ? `☁ ${t.cloud}` : `⚠ ${t.offline}`}</span>
            </div>
          )}
        </main>
      </div>

      {/* 설정 스피드다이얼 FAB */}
      <div ref={settingsRef} className={`workspace__settings-wrap${settingsOpen ? ' is-open' : ''}`}>
        {/* 에디터 언어모드 */}
        <button
          type="button"
          className={`workspace__settings-sub${editorMode !== 'auto' ? ' is-active' : ''}`}
          style={{ transitionDelay: settingsOpen ? '210ms' : '0ms' }}
          data-tooltip={`${t.editorMode}: ${editorMode === 'auto' ? t.editorModeAuto : editorMode.toUpperCase()}`}
          onClick={() => setEditorMode((v) => v === 'auto' ? 'md' : v === 'md' ? 'txt' : 'auto')}
          aria-label="에디터 모드 전환"
        >
          <RiEditLine size={14} />
        </button>
        {/* LANGUAGE */}
        <button
          type="button"
          className={`workspace__settings-sub${uiLang === 'en' ? ' is-active' : ''}`}
          style={{ transitionDelay: settingsOpen ? '175ms' : '35ms' }}
          data-tooltip={`Language: ${uiLang.toUpperCase()}`}
          onClick={() => setUiLang(uiLang === 'ko' ? 'en' : 'ko')}
          aria-label="언어 전환"
        >
          <RiGlobalLine size={14} />
        </button>
        {/* ZEN 모드 */}
        <button
          type="button"
          className={`workspace__settings-sub${zenMode ? ' is-active' : ''}`}
          style={{ transitionDelay: settingsOpen ? '140ms' : '70ms' }}
          data-tooltip={`${t.zenMode}: ${zenMode ? 'ON' : 'OFF'}`}
          onClick={() => setZenMode((v) => !v)}
          aria-label="ZEN 모드 전환"
        >
          <RiFullscreenLine size={14} />
        </button>
        {/* HUD 버블 */}
        <button
          type="button"
          className={`workspace__settings-sub${hudMode === 'hud' ? ' is-active' : ''}`}
          style={{ transitionDelay: settingsOpen ? '105ms' : '105ms' }}
          data-tooltip={t.hudBubble}
          onClick={() => setHudMode('hud')}
          aria-label="HUD 버블 모드"
        >
          <RiFocus3Line size={14} />
        </button>
        {/* 상태바 */}
        <button
          type="button"
          className={`workspace__settings-sub${hudMode === 'statusbar' ? ' is-active' : ''}`}
          style={{ transitionDelay: settingsOpen ? '70ms' : '140ms' }}
          data-tooltip={t.statusBar}
          onClick={() => setHudMode('statusbar')}
          aria-label="상태바 모드"
        >
          <RiLayoutBottom2Line size={14} />
        </button>
        {/* 사이드바 */}
        <button
          type="button"
          className={`workspace__settings-sub${sidebarOpen ? ' is-active' : ''}`}
          style={{ transitionDelay: settingsOpen ? '35ms' : '175ms' }}
          data-tooltip={`${t.sidebar}: ${sidebarOpen ? 'ON' : 'OFF'}`}
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="사이드바 전환"
        >
          <RiLayoutLeftLine size={14} />
        </button>
        {/* 테마 (FAB에서 가장 가까운 위치) */}
        <button
          type="button"
          className="workspace__settings-sub"
          style={{ transitionDelay: settingsOpen ? '0ms' : '210ms' }}
          data-tooltip={`${t.theme}: ${theme === 'dark' ? t.themeDark : t.themeLight}`}
          onClick={toggleTheme}
          aria-label="테마 전환"
        >
          {theme === 'dark' ? <RiSunLine size={14} /> : <RiMoonLine size={14} />}
        </button>
        {/* 메인 FAB */}
        <button
          type="button"
          className={`workspace__settings-fab${settingsOpen ? ' is-open' : ''}`}
          onClick={() => setSettingsOpen((v) => !v)}
          aria-label={t.settings}
        >
          {settingsOpen ? <RiCloseLine size={16} /> : <RiSettings3Line size={16} />}
        </button>
      </div>
    </div>
  )
}
