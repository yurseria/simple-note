import { useState, useRef, useEffect } from 'react'
import type { TabState } from '../../../../types/tab'
import './Tab.css'

interface Props {
  tab: TabState
  isActive: boolean
  onClick: () => void
  onClose: () => void
  onRename: (name: string) => void
  onDragStart: () => void
  onDrop: () => void
}

export function Tab({
  tab,
  isActive,
  onClick,
  onClose,
  onRename,
  onDragStart,
  onDrop
}: Props): JSX.Element {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.select()
    }
  }, [isRenaming])

  function startRename(): void {
    setRenameValue(tab.fileName)
    setIsRenaming(true)
  }

  function commitRename(): void {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== tab.fileName) {
      onRename(trimmed)
    }
    setIsRenaming(false)
  }

  function cancelRename(): void {
    setIsRenaming(false)
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
        <input
          ref={inputRef}
          className="tab__rename-input"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
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
        />
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
