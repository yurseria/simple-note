import { useEffect, useRef, useState, useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import {
  setSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  selectMatches,
  SearchQuery
} from '@codemirror/search'
import './FindReplace.css'

interface Props {
  view: EditorView
  initialMode: 'find' | 'replace'
  onClose: () => void
}

interface MatchInfo {
  current: number
  total: number
}

function computeMatchInfo(view: EditorView, sq: SearchQuery): MatchInfo | null {
  if (!sq.search) return null

  const matches: Array<{ from: number; to: number }> = []
  try {
    const cursor = sq.getCursor(view.state)
    for (;;) {
      const r = cursor.next()
      if (r.done) break
      matches.push({ from: r.value.from, to: r.value.to })
    }
  } catch {
    return null
  }

  const total = matches.length
  if (total === 0) return { current: 0, total: 0 }

  const sel = view.state.selection.main
  const exactIdx = matches.findIndex(m => m.from === sel.from && m.to === sel.to)
  if (exactIdx !== -1) return { current: exactIdx + 1, total }

  const nextIdx = matches.findIndex(m => m.from >= sel.head)
  return { current: nextIdx !== -1 ? nextIdx + 1 : total, total }
}

export function FindReplace({ view, initialMode, onClose }: Props): JSX.Element {
  const [showReplace, setShowReplace] = useState(initialMode === 'replace')
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null)
  const [hasError, setHasError] = useState(false)

  const findInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    findInputRef.current?.focus()
    findInputRef.current?.select()
  }, [])

  // Replace row 열릴 때 replace input에 포커스
  useEffect(() => {
    if (showReplace && initialMode === 'replace') {
      setTimeout(() => replaceInputRef.current?.focus(), 0)
    }
  }, [showReplace, initialMode])

  const buildQuery = useCallback(
    (overrides?: Partial<{ query: string; replacement: string; caseSensitive: boolean; wholeWord: boolean; useRegex: boolean }>) => {
      const q = overrides?.query ?? query
      const r = overrides?.replacement ?? replacement
      const cs = overrides?.caseSensitive ?? caseSensitive
      const ww = overrides?.wholeWord ?? wholeWord
      const rx = overrides?.useRegex ?? useRegex
      return new SearchQuery({ search: q, replace: r, caseSensitive: cs, wholeWord: ww, regexp: rx })
    },
    [query, replacement, caseSensitive, wholeWord, useRegex]
  )

  const syncToEditor = useCallback(
    (sq: SearchQuery) => {
      try {
        view.dispatch({ effects: setSearchQuery.of(sq) })
        setHasError(false)
        setMatchInfo(computeMatchInfo(view, sq))
      } catch {
        setHasError(true)
        setMatchInfo(null)
      }
    },
    [view]
  )

  // 검색어/옵션 변경 시 CM 동기화
  useEffect(() => {
    const sq = buildQuery()
    if (!sq.search) {
      view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) })
      setMatchInfo(null)
      setHasError(false)
      return
    }
    syncToEditor(sq)
  }, [query, replacement, caseSensitive, wholeWord, useRegex, buildQuery, syncToEditor, view])

  const refreshMatchInfo = useCallback(() => {
    const sq = buildQuery()
    if (sq.search) setMatchInfo(computeMatchInfo(view, sq))
  }, [buildQuery, view])

  const handleFindNext = useCallback(() => {
    if (!query) return
    findNext(view)
    setTimeout(refreshMatchInfo, 0)
  }, [query, view, refreshMatchInfo])

  const handleFindPrev = useCallback(() => {
    if (!query) return
    findPrevious(view)
    setTimeout(refreshMatchInfo, 0)
  }, [query, view, refreshMatchInfo])

  const handleReplace = useCallback(() => {
    if (!query) return
    replaceNext(view)
    setTimeout(refreshMatchInfo, 0)
  }, [query, view, refreshMatchInfo])

  const handleReplaceAll = useCallback(() => {
    if (!query) return
    replaceAll(view)
    setTimeout(refreshMatchInfo, 0)
  }, [query, view, refreshMatchInfo])

  const handleSelectAll = useCallback(() => {
    if (!query) return
    selectMatches(view)
    onClose()
  }, [query, view, onClose])

  const handleClose = useCallback(() => {
    view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) })
    onClose()
  }, [view, onClose])

  const handleFindKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') { e.preventDefault(); handleClose() }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) handleFindPrev()
        else handleFindNext()
      }
    },
    [handleClose, handleFindNext, handleFindPrev]
  )

  const handleReplaceKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') { e.preventDefault(); handleClose() }
      if (e.key === 'Enter') { e.preventDefault(); handleReplace() }
    },
    [handleClose, handleReplace]
  )

  // CM이 키보드 이벤트를 가로채지 않도록 패널 내 키 이벤트 버블링 차단
  const stopEditorPropagation = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape') e.stopPropagation()
  }

  const noMatch = !!query && matchInfo?.total === 0
  const disabled = !query || noMatch

  const matchLabel = !query
    ? ''
    : matchInfo === null
      ? ''
      : matchInfo.total === 0
        ? '결과 없음'
        : `${matchInfo.current}/${matchInfo.total}`

  return (
    <div className="fr" onKeyDown={stopEditorPropagation}>
      {/* ── Find row ─────────────────────────────── */}
      <div className="fr__row">
        <button
          className={`fr__toggle ${showReplace ? 'fr__toggle--open' : ''}`}
          onClick={() => setShowReplace(v => !v)}
          title="바꾸기 토글"
          tabIndex={-1}
          aria-label="바꾸기 섹션 토글"
        >
          ›
        </button>

        <div className={`fr__input-wrap ${hasError ? 'fr__input-wrap--error' : ''} ${noMatch ? 'fr__input-wrap--no-match' : ''}`}>
          <input
            ref={findInputRef}
            className="fr__input"
            type="text"
            placeholder="찾기"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleFindKeyDown}
            spellCheck={false}
          />
          <span className="fr__match-count">{matchLabel}</span>
        </div>

        <div className="fr__opts">
          <button
            className={`fr__opt-btn ${caseSensitive ? 'fr__opt-btn--active' : ''}`}
            onClick={() => setCaseSensitive(v => !v)}
            title="대소문자 구분 (Alt+C)"
            tabIndex={-1}
          >
            Aa
          </button>
          <button
            className={`fr__opt-btn ${wholeWord ? 'fr__opt-btn--active' : ''}`}
            onClick={() => setWholeWord(v => !v)}
            title="전체 단어 일치 (Alt+W)"
            tabIndex={-1}
          >
            <span className="fr__whole-word">ab</span>
          </button>
          <button
            className={`fr__opt-btn ${useRegex ? 'fr__opt-btn--active' : ''}`}
            onClick={() => setUseRegex(v => !v)}
            title="정규식 사용 (Alt+R)"
            tabIndex={-1}
          >
            .*
          </button>
        </div>

        <div className="fr__nav">
          <button
            className="fr__nav-btn"
            onClick={handleFindPrev}
            title="이전 항목 (Shift+Enter)"
            tabIndex={-1}
            disabled={disabled}
            aria-label="이전 일치 항목"
          >
            ↑
          </button>
          <button
            className="fr__nav-btn"
            onClick={handleFindNext}
            title="다음 항목 (Enter)"
            tabIndex={-1}
            disabled={disabled}
            aria-label="다음 일치 항목"
          >
            ↓
          </button>
          <button
            className="fr__nav-btn"
            onClick={handleSelectAll}
            title="모두 선택"
            tabIndex={-1}
            disabled={disabled}
            aria-label="모두 선택"
          >
            ☰
          </button>
        </div>

        <button
          className="fr__close"
          onClick={handleClose}
          title="닫기 (Esc)"
          tabIndex={-1}
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      {/* ── Replace row ──────────────────────────── */}
      {showReplace && (
        <div className="fr__row fr__row--replace">
          <div className="fr__replace-indent" />

          <div className="fr__input-wrap">
            <input
              ref={replaceInputRef}
              className="fr__input"
              type="text"
              placeholder="바꾸기"
              value={replacement}
              onChange={e => setReplacement(e.target.value)}
              onKeyDown={handleReplaceKeyDown}
              spellCheck={false}
            />
          </div>

          <div className="fr__replace-actions">
            <button
              className="fr__replace-btn"
              onClick={handleReplace}
              title="바꾸기 (Enter)"
              disabled={!query}
            >
              바꾸기
            </button>
            <button
              className="fr__replace-btn"
              onClick={handleReplaceAll}
              title="모두 바꾸기"
              disabled={!query}
            >
              모두 바꾸기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
