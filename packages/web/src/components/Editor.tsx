// Design Ref: §5.4 PWA Editor — 탭 전환 (모바일), 분할 (데스크탑)
// Plan SC: FR-12 (마크다운 + 미리보기), FR-13 (탭 전환), FR-16 (데스크탑 분할)

'use client'

import { useEffect, useRef, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { MarkdownPreview } from '@simple-note/renderer/components/MarkdownPreview'
import { CodeMirrorEditor } from './CodeMirrorEditor'
import { MarkdownToolbar } from './MarkdownToolbar'
import { useT } from '../lib/i18n'
import './Editor.css'

export type EditorViewMode = 'preview' | 'edit' | 'split'

interface Props {
  name: string
  content: string
  onChange: (next: string) => void
  isMarkdown: boolean
  view: EditorViewMode
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
  const t = useT()
  const cmViewRef = useRef<EditorView | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const panesRef = useRef<HTMLDivElement>(null)
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [theme, setTheme] = useState<string>('light')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme ?? 'light')
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme ?? 'light')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (view === 'edit' && cmViewRef.current) {
      cmViewRef.current.focus()
    }
  }, [view])

  function handleDividerMouseDown(e: React.MouseEvent<HTMLDivElement>): void {
    e.preventDefault()
    const panes = panesRef.current
    if (!panes) return
    function onMove(ev: MouseEvent): void {
      const rect = panes!.getBoundingClientRect()
      setSplitRatio(Math.min(0.8, Math.max(0.2, (ev.clientX - rect.left) / rect.width)))
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

  function applyToolbarOp(fn: (value: string, s: number, e: number) => [string, number, number]): void {
    // Desktop: CodeMirror
    if (cmViewRef.current) {
      const cmView = cmViewRef.current
      const { state } = cmView
      const { from, to } = state.selection.main
      const value = state.doc.toString()
      const [newVal, newFrom, newTo] = fn(value, from, to)
      cmView.dispatch({
        ...(newVal !== value && { changes: { from: 0, to: value.length, insert: newVal } }),
        selection: EditorSelection.range(newFrom, newTo),
        scrollIntoView: true,
      })
      cmView.focus()
      return
    }
    // Mobile: textarea
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart ?? 0
    const e = ta.selectionEnd ?? 0
    const [newVal, newFrom, newTo] = fn(ta.value, s, e)
    onChange(newVal)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(newFrom, newTo)
    })
  }

  const showEdit = view === 'edit' || view === 'split'
  const showPreview = view === 'preview' || view === 'split'

  return (
    <div className="editor">
      {isMarkdown && showEdit && (
        <MarkdownToolbar onApply={applyToolbarOp} />
      )}
      {view === 'split' ? (
        <div className="editor__panes editor__panes--split" ref={panesRef}>
          <div className="cm-host" style={{ width: `${splitRatio * 100}%`, flexShrink: 0 }}>
            <CodeMirrorEditor
              content={content}
              onChange={onChange}
              isMarkdown={isMarkdown}
              readOnly={readOnly}
              theme={theme}
              editorRef={cmViewRef}
            />
          </div>
          <div className="editor__divider" onMouseDown={handleDividerMouseDown} />
          <MarkdownPreview content={content} theme={theme} assetProtocol={false} />
        </div>
      ) : (
        <div className="editor__panes">
          {showEdit && (
            isMobile ? (
              <textarea
                ref={taRef}
                className="editor__ta"
                value={content}
                onChange={(e) => onChange(e.target.value)}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="sentences"
                autoComplete="off"
                readOnly={readOnly}
              />
            ) : (
              <CodeMirrorEditor
                content={content}
                onChange={onChange}
                isMarkdown={isMarkdown}
                readOnly={readOnly}
                theme={theme}
                editorRef={cmViewRef}
              />
            )
          )}
          {showPreview && (
            isMarkdown ? (
              <MarkdownPreview content={content} theme={theme} assetProtocol={false} />
            ) : (
              <div className="editor__preview">
                <pre className="editor__plain">{content}</pre>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
