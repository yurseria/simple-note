// Design Ref: §5.2 Flow 1, §5.4 PWA Editor — 탭 전환 + 저장/다운로드
// Plan SC: FR-12 (편집 화면), FR-13 (탭 전환), FR-14 (하단 바), FR-17 (다운로드), FR-29 (H1 자동)

'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { deriveFilenameFromContent } from '@simple-note/renderer/domain/filename'
import { Editor, type EditorViewMode } from '../../../../components/Editor'
import { BottomBar } from '../../../../components/BottomBar'
import { OfflineBanner } from '../../../../components/OfflineBanner'
import {
  getCurrentUser,
  isAuthenticated,
  readFile,
  renameFile,
  saveFile,
} from '../../../../lib/cloudApi'
import { enqueueEdit } from '../../../../lib/syncQueue'
import { useCloudState } from '../../../../lib/useCloudState'
import { useWebTabStore } from '../../../../lib/webTabStore'
import { useT, getT } from '../../../../lib/i18n'
import './editor.css'

function isMarkdownName(name: string): boolean {
  const l = name.toLowerCase()
  return l.endsWith('.md') || l.endsWith('.markdown')
}

function getMimeExt(name: string): 'md' | 'txt' {
  return isMarkdownName(name) ? 'md' : 'txt'
}

export default function EditorPage({
  params,
}: {
  params: Promise<{ fileId: string }>
}): JSX.Element {
  const { fileId } = use(params)
  const isNew = fileId === 'new' || /^new-\d+$/.test(fileId)
  const router = useRouter()
  const t = useT()

  const [name, setName] = useState<string>(isNew ? getT().untitledMd : '')
  const [originalContent, setOriginalContent] = useState<string>('')
  const [content, setContent] = useState<string>('')
  const [baseEtag, setBaseEtag] = useState<string>('')
  const [currentFileId, setCurrentFileId] = useState<string | null>(
    isNew ? null : fileId
  )
  const [view, setView] = useState<EditorViewMode>(isNew ? 'edit' : 'preview')
  const [loading, setLoading] = useState<boolean>(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState<boolean>(false)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [userDefinedName, setUserDefinedName] = useState(false)
  const [targetFolderId, setTargetFolderId] = useState<string | undefined>()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const online = useCloudState((s) => s.online)
  const upsertFile = useCloudState((s) => s.upsertFile)
  const openTab = useWebTabStore((s) => s.openTab)
  const closeTab = useWebTabStore((s) => s.closeTab)
  const isMarkdownBase = useMemo(() => isMarkdownName(name), [name])
  const [editorModeOverride, setEditorModeOverride] = useState<boolean | null>(null)
  const isMarkdown = editorModeOverride !== null ? editorModeOverride : isMarkdownBase
  const isDirty = content !== originalContent
  // 데스크탑 뷰포트 감지 — 860px+ 에서 분할 에디터 (DESIGN.md §5.1 기준)
  const [isWide, setIsWide] = useState<boolean>(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 860px)')
    const update = () => setIsWide(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!isNew) return
    const fid = new URLSearchParams(window.location.search).get('folderId')
    if (fid) setTargetFolderId(fid)
  }, [isNew])

  useEffect(() => {
    function onSetMode(e: Event): void {
      const mode = (e as CustomEvent<'auto' | 'md' | 'txt'>).detail
      if (mode === 'auto') setEditorModeOverride(null)
      else setEditorModeOverride(mode === 'md')
    }
    window.addEventListener('note:set-editor-mode', onSetMode)
    return () => window.removeEventListener('note:set-editor-mode', onSetMode)
  }, [])

  // 탭 등록 — 신규 문서는 fileId(new-1 등) 임시 탭, 저장 후 실제 ID 탭으로 교체
  useEffect(() => {
    if (isNew && !currentFileId) {
      openTab({ id: fileId, name })
      return
    }
    const id = currentFileId ?? fileId
    if (id && name) openTab({ id, name })
  }, [currentFileId, fileId, isNew, name, openTab])

  // auth 가드 + 파일 로드
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/')
      return
    }
    if (isNew) return

    let cancelled = false
    // 파일 fetch 초기화 상태 — 효과 내 setState 는 외부(Drive API) 와 동기화 목적
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)

    setError(null)

    // 파일 body + name 병렬 취득 (readFile에 name 포함)
    readFile(fileId)
      .then((result) => {
        if (cancelled) return
        setOriginalContent(result.content)
        setContent(result.content)
        setBaseEtag(result.etag)
        setFromCache(Boolean(result.fromCache))
        if (result.name) setName(result.name)
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
  }, [fileId, isNew, router])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Broadcast file stats for the HUD bubble in layout
  useEffect(() => {
    const chars = content.length
    const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length
    const lines = content === '' ? 0 : content.split('\n').length
    window.dispatchEvent(new CustomEvent('note:hud-update', {
      detail: { isMarkdown, chars, words, lines },
    }))
  }, [content, isMarkdown])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      // 신규 파일: 유저가 직접 이름을 바꿨으면 그대로, 아니면 H1 도출 (FR-29)
      const finalName = currentFileId
        ? name
        : userDefinedName
          ? name
          : deriveFilenameFromContent(content, getMimeExt(name))

      if (!online) {
        // Offline: 큐에 기록하고 바로 반환 (FR-22)
        const queueId = currentFileId ?? `new:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        await enqueueEdit({
          fileId: queueId,
          localContent: content,
          baseEtag,
          pendingName: currentFileId ? undefined : finalName,
        })
        setOriginalContent(content)
        showToast(t.offlineSaveQueued)
        return
      }

      const result = await saveFile(finalName, content, currentFileId ?? undefined, currentFileId ? undefined : targetFolderId)
      setOriginalContent(content)
      setName(result.name)
      setBaseEtag(result.etag)
      upsertFile({ id: result.id, name: result.name, mimeType: isMarkdownName(result.name) ? 'text/markdown' : 'text/plain', modifiedTime: new Date().toISOString(), parentId: result.parentId })
      if (!currentFileId) {
        closeTab(fileId)
        setCurrentFileId(result.id)
        // URL 정리: /editor/new → /editor/{id}
        router.replace(`/editor/${result.id}`)
      }
      if (result.renamed) {
        showToast(t.renamedSaved(result.name))
      } else {
        showToast(t.saved)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }, [saving, currentFileId, name, content, router, showToast, online, baseEtag, t, upsertFile, userDefinedName, targetFolderId])

  // 데스크탑 탭바 저장 버튼 → 커스텀 이벤트로 트리거
  useEffect(() => {
    const handler = () => void handleSave()
    window.addEventListener('note:request-save', handler)
    return () => window.removeEventListener('note:request-save', handler)
  }, [handleSave])

  // 탭 더블클릭 이름 변경 수신
  useEffect(() => {
    function onFileRenamed(e: Event): void {
      const { fileId, name: newName } = (e as CustomEvent<{ fileId: string; name: string }>).detail
      if (fileId === currentFileId) setName(newName)
    }
    window.addEventListener('note:file-renamed', onFileRenamed)
    return () => window.removeEventListener('note:file-renamed', onFileRenamed)
  }, [currentFileId])

  // 저장 상태를 탭바에 브로드캐스트 (dirty / saving / clean)
  // 새 파일이더라도 내용이 없으면 dirty 로 표시하지 않음 (빈 탭 닫기 경고 방지)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('note:save-state', {
      detail: { isDirty: isDirty || (!currentFileId && content !== ''), saving },
    }))
  }, [isDirty, saving, currentFileId, content])

  // 언마운트 시 탭바 저장 버튼 초기화
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('note:save-state', {
        detail: { isDirty: false, saving: false },
      }))
    }
  }, [])

  // 미저장 데이터 있을 때 브라우저 닫기/리로드 경고
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Cmd+S / Ctrl+S 저장 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [handleSave])

  // 자동 저장: 마지막 수정 후 5초 (기존 파일, 온라인 한정)
  const handleSaveRef = useRef(handleSave)
  useEffect(() => { handleSaveRef.current = handleSave }, [handleSave])
  useEffect(() => {
    if (!isDirty || !currentFileId || saving || !online) return
    const timer = setTimeout(() => void handleSaveRef.current(), 5000)
    return () => clearTimeout(timer)
  }, [isDirty, content, currentFileId, saving, online])

  // 뒤로 가기 (상위 depth /files)
  function handleBack(): void {
    const hasUnsaved = isDirty || (!currentFileId && content !== '')
    if (hasUnsaved && !window.confirm(t.unsavedLeave)) return
    router.replace('/files')
  }

  const handleDownload = useCallback(() => {
    const ext = getMimeExt(name)
    const mime = ext === 'md' ? 'text/markdown' : 'text/plain'
    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [content, name])

  useEffect(() => {
    if (editingName) nameInputRef.current?.select()
  }, [editingName])

  const handleRenameCommit = useCallback(async (newName: string) => {
    const trimmed = newName.trim()
    setEditingName(false)
    if (!trimmed || trimmed === name) return
    setUserDefinedName(true)
    setName(trimmed)
    openTab({ id: currentFileId ?? fileId, name: trimmed })
    if (currentFileId) {
      try {
        await renameFile(currentFileId, trimmed)
        upsertFile({ id: currentFileId, name: trimmed, mimeType: isMarkdownName(trimmed) ? 'text/markdown' : 'text/plain', modifiedTime: new Date().toISOString() })
      } catch {
        setName(name)
      }
    }
  }, [name, currentFileId, fileId, openTab, upsertFile])

  const user = getCurrentUser()

  return (
    <div className="editor-page">
      <OfflineBanner />
      <nav className="editor-page__nav">
        <button type="button" className="editor-page__back" aria-label={t.back} onClick={handleBack}>
          <ArrowLeft size={18} />
          <span>{t.back}</span>
        </button>
        {editingName ? (
          <input
            ref={nameInputRef}
            className="editor-page__title-input"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => void handleRenameCommit(draftName)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.currentTarget.blur() }
              else if (e.key === 'Escape') { setEditingName(false); setDraftName(name) }
            }}
          />
        ) : (
          <div
            className="editor-page__title"
            title={name}
            onClick={() => { setDraftName(name); setEditingName(true) }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') { setDraftName(name); setEditingName(true) } }}
          >
            {isDirty ? `· ${name}` : name}
          </div>
        )}
      </nav>

      {isMarkdown && !isWide && (
        <div
          className={`editor-page__view-pill${view === 'preview' ? ' is-preview' : ''}`}
          role="group"
          aria-label="보기 모드"
        >
          <button
            type="button"
            className={`editor-page__view-pill-btn${view === 'edit' ? ' is-on' : ''}`}
            onClick={() => setView('edit')}
          >
            {t.edit}
          </button>
          <button
            type="button"
            className={`editor-page__view-pill-btn${view === 'preview' ? ' is-on' : ''}`}
            onClick={() => setView('preview')}
          >
            {t.preview}
          </button>
          <span className="editor-page__view-pill-thumb" aria-hidden />
        </div>
      )}

      {loading && <div className="editor-page__status">{t.loading}</div>}
      {error && (
        <div className="editor-page__error">
          {t.error(error)}
        </div>
      )}

      {!loading && (
        <Editor
          name={name}
          content={content}
          onChange={setContent}
          isMarkdown={isMarkdown}
          view={
            !isMarkdown
              ? 'edit'
              : isWide
                ? 'split'
                : view
          }
        />
      )}

      <BottomBar
        statusText={
          fromCache
            ? t.offlineEditingCache
            : isDirty
              ? t.cloudEditing()
              : currentFileId
                ? t.cloudSaved
                : t.cloudNew
        }
        isDirty={isDirty || !currentFileId}
        saving={saving}
        onSave={handleSave}
        onDownload={handleDownload}
        content={content}
        isMarkdown={isMarkdown}
      />

      {toast && <div className="editor-page__toast">{toast}</div>}
    </div>
  )
}
