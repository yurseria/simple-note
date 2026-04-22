// Design Ref: §5.2 Flow 1, §5.4 PWA Editor — 탭 전환 + 저장/다운로드
// Plan SC: FR-12 (편집 화면), FR-13 (탭 전환), FR-14 (하단 바), FR-17 (다운로드), FR-29 (H1 자동)

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { deriveFilenameFromContent } from '@simple-note/renderer/domain/filename'
import { Editor, type EditorView } from '../../../components/Editor'
import { BottomBar } from '../../../components/BottomBar'
import { OfflineBanner } from '../../../components/OfflineBanner'
import {
  fetchMetadata,
  getCurrentUser,
  isAuthenticated,
  readFile,
  saveFile,
} from '../../../lib/cloudApi'
import { enqueueEdit } from '../../../lib/syncQueue'
import { useCloudState } from '../../../lib/useCloudState'
import './editor.css'

const ICON_BACK = 'M7.828 11H20v2H7.828l5.364 5.364-1.414 1.414L4 12l7.778-7.778 1.414 1.414z'

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
  const isNew = fileId === 'new'
  const router = useRouter()

  const [name, setName] = useState<string>(isNew ? '제목 없음.md' : '')
  const [originalContent, setOriginalContent] = useState<string>('')
  const [content, setContent] = useState<string>('')
  const [baseEtag, setBaseEtag] = useState<string>('')
  const [currentFileId, setCurrentFileId] = useState<string | null>(
    isNew ? null : fileId
  )
  const [view, setView] = useState<EditorView>(isNew ? 'edit' : 'preview')
  const [loading, setLoading] = useState<boolean>(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState<boolean>(false)

  const online = useCloudState((s) => s.online)
  const isMarkdown = useMemo(() => isMarkdownName(name), [name])
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

    // 파일 body 먼저 (캐시 폴백 포함) + 가능하면 metadata 보강
    readFile(fileId)
      .then(async (result) => {
        if (cancelled) return
        setOriginalContent(result.content)
        setContent(result.content)
        setBaseEtag(result.etag)
        setFromCache(Boolean(result.fromCache))
        // 이름은 metadata 에서 취득 — 오프라인이면 실패해도 무방 (기존 name 유지)
        try {
          const meta = await fetchMetadata(fileId)
          if (!cancelled && meta?.name) setName(meta.name)
        } catch {
          /* ignore — offline etc */
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
  }, [fileId, isNew, router])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      // 신규 파일이면 H1 기반으로 파일명 도출 (FR-29)
      const finalName = currentFileId
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
        showToast('오프라인 — 저장 대기열에 추가됨')
        return
      }

      const result = await saveFile(finalName, content, currentFileId ?? undefined)
      setOriginalContent(content)
      setName(result.name)
      setBaseEtag(result.etag)
      if (!currentFileId) {
        setCurrentFileId(result.id)
        // URL 정리: /editor/new → /editor/{id}
        router.replace(`/editor/${result.id}`)
      }
      if (result.renamed) {
        showToast(`같은 이름이 있어 "${result.name}"으로 저장됨`)
      } else {
        showToast('저장됨')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }, [saving, currentFileId, name, content, router, showToast, online, baseEtag])

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

  const user = getCurrentUser()

  return (
    <div className="editor-page">
      <OfflineBanner />
      <nav className="editor-page__nav">
        <Link href="/files" className="editor-page__back" aria-label="목록으로">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d={ICON_BACK} />
          </svg>
          <span>목록</span>
        </Link>
        <div className="editor-page__title" title={name}>
          {isDirty ? `· ${name}` : name}
        </div>
        {!isWide && isMarkdown && (
          <button
            type="button"
            className="editor-page__view-toggle"
            onClick={() => setView((v) => (v === 'edit' ? 'preview' : 'edit'))}
          >
            {view === 'edit' ? '미리보기' : '편집'}
          </button>
        )}
      </nav>

      {isMarkdown && !isWide && (
        <div className="editor-page__tabs">
          <button
            type="button"
            className={`editor-page__tab${view === 'preview' ? ' is-on' : ''}`}
            onClick={() => setView('preview')}
          >
            미리보기
          </button>
          <button
            type="button"
            className={`editor-page__tab${view === 'edit' ? ' is-on' : ''}`}
            onClick={() => setView('edit')}
          >
            편집
          </button>
        </div>
      )}

      {loading && <div className="editor-page__status">로딩 중...</div>}
      {error && (
        <div className="editor-page__error">
          오류: {error}
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
            ? '⚠ 오프라인 — 캐시된 사본 편집 중'
            : isDirty
              ? `☁ 클라우드 · 편집 중${user ? ` · ${user.email}` : ''}`
              : currentFileId
                ? '☁ 클라우드 · 저장됨'
                : '☁ 클라우드 · 새 문서'
        }
        isDirty={isDirty || !currentFileId}
        saving={saving}
        onSave={handleSave}
        onDownload={handleDownload}
      />

      {toast && <div className="editor-page__toast">{toast}</div>}
    </div>
  )
}

