// Design Ref: §5.5 Interaction Rules — rename 중복 시 인라인 에러
// Plan SC: FR-31 (rename 시 중복 → 인라인 에러 + 저장 차단)

import { useState, useRef, useEffect } from 'react'
import type { TabState } from '../../types/tab'
import { validateRename } from '../../domain/filename'
import './Tab.css'

interface Props {
  tab: TabState
  isActive: boolean
  /** 이 탭을 제외한 다른 탭들의 fileName — rename 검증에 사용 */
  existingNames: readonly string[]
  onClick: () => void
  onClose: () => void
  onRename: (name: string) => void
  onDragStart: () => void
  onDrop: () => void
}

export function Tab({
  tab,
  isActive,
  existingNames,
  onClick,
  onClose,
  onRename,
  onDragStart,
  onDrop
}: Props): JSX.Element {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.select()
    }
  }, [isRenaming])

  function startRename(): void {
    setRenameValue(tab.fileName)
    setRenameError(null)
    setIsRenaming(true)
  }

  function errorMessage(
    reason: 'duplicate' | 'empty' | 'invalid-chars'
  ): string {
    if (reason === 'duplicate') return '이미 사용 중인 이름입니다'
    if (reason === 'empty') return '이름을 입력하세요'
    return '사용할 수 없는 문자가 포함돼 있습니다'
  }

  function commitRename(): void {
    const trimmed = renameValue.trim()
    if (trimmed === tab.fileName) {
      setIsRenaming(false)
      setRenameError(null)
      return
    }
    const result = validateRename(trimmed, existingNames)
    if (!result.ok) {
      setRenameError(errorMessage(result.reason))
      // 저장 차단 — 인라인 에러 유지, input focus
      inputRef.current?.focus()
      return
    }
    onRename(trimmed)
    setIsRenaming(false)
    setRenameError(null)
  }

  function cancelRename(): void {
    setIsRenaming(false)
    setRenameError(null)
  }

  return (
    <div
      className={`tab ${isActive ? 'tab--active' : ''}`}
      role="tab"
      aria-selected={isActive}
      draggable={!isRenaming}
      onClick={onClick}
      onMouseDown={(e) => {
        if (e.button === 1) {
          e.preventDefault()
          onClose()
        }
      }}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {isRenaming ? (
        <span className="tab__rename-wrap">
          <input
            ref={inputRef}
            className={`tab__rename-input${renameError ? ' tab__rename-input--error' : ''}`}
            value={renameValue}
            onChange={(e) => {
              setRenameValue(e.target.value)
              if (renameError) setRenameError(null)
            }}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitRename()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancelRename()
              }
              e.stopPropagation()
            }}
            onClick={(e) => e.stopPropagation()}
            aria-invalid={renameError ? true : undefined}
            aria-describedby={renameError ? `tab-rename-error-${tab.id}` : undefined}
          />
          {renameError && (
            <span
              id={`tab-rename-error-${tab.id}`}
              className="tab__rename-error"
              role="alert"
            >
              {renameError}
            </span>
          )}
        </span>
      ) : (
        <span className="tab__name" onDoubleClick={(e) => { e.stopPropagation(); startRename() }}>
          {tab.fileName}
          {tab.isDirty && <span className="tab__dirty">•</span>}
        </span>
      )}
      <button
        className="tab__close"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label={`${tab.fileName} 탭 닫기`}
      >
        ×
      </button>
    </div>
  )
}
