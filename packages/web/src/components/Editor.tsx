// Design Ref: §5.4 PWA Editor — 탭 전환 (모바일), 분할 (데스크탑)
// Plan SC: FR-12 (마크다운 + 미리보기), FR-13 (탭 전환), FR-16 (데스크탑 분할)

'use client'

import { useEffect, useMemo, useRef } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import './Editor.css'

export type EditorView = 'preview' | 'edit' | 'split'

interface Props {
  name: string
  content: string
  onChange: (next: string) => void
  isMarkdown: boolean
  view: EditorView
  readOnly?: boolean
}

export function Editor({
  name,
  content,
  onChange,
  isMarkdown,
  view,
  readOnly,
}: Props): JSX.Element {
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  const html = useMemo(() => {
    if (!isMarkdown) return null
    const raw = marked.parse(content, { async: false }) as string
    return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
  }, [content, isMarkdown])

  // edit 탭으로 전환되면 textarea focus (모바일 UX)
  useEffect(() => {
    if (view === 'edit' && taRef.current) {
      taRef.current.focus()
    }
  }, [view])

  const showEdit = view === 'edit' || view === 'split'
  const showPreview = view === 'preview' || view === 'split'

  return (
    <div className={`editor editor--${view}`}>
      {showEdit && (
        <textarea
          ref={taRef}
          className="editor__ta"
          value={content}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          placeholder={isMarkdown ? '# 제목을 입력하세요\n\n내용...' : ''}
          spellCheck={false}
          aria-label={name}
        />
      )}
      {showPreview && (
        <div className="editor__preview">
          {isMarkdown ? (
            <div
              className="editor__md"
              dangerouslySetInnerHTML={{ __html: html ?? '' }}
            />
          ) : (
            <pre className="editor__plain">{content}</pre>
          )}
        </div>
      )}
    </div>
  )
}
