// Design Ref: §5.1, §5.3, §5.4 — TabBar 개편 (좌측 사이드바 토글, 우측 저장 상태 + CloudButton)
// Plan SC: FR-01 (사이드바 토글), FR-02 (저장 상태), FR-03 (유저 아바타 탭바 우측)

import { useRef } from 'react'
import { useTabStore } from '../../store/tabStore'
import { useUIStore } from '../../store/uiStore'
import { CloudButton } from '../TitleBar/CloudButton'
import { Tab } from './Tab'
import './TabBar.css'

interface Props {
  onNewTab: () => void
  onCloseTab: (id: string) => void
}

// Remix Icon `ri-layout-left-line` — 패널 레이아웃 토글 (DESIGN.md §8 inline SVG)
const ICON_SIDEBAR_TOGGLE =
  'M21 3.993v16.014a1 1 0 0 1-.993.993H3.993A.993.993 0 0 1 3 20.007V3.993A1 1 0 0 1 3.993 3h16.014c.548 0 .993.445.993.993zM10 5H5v14h5V5zm2 0v14h7V5h-7z'

export function TabBar({ onNewTab, onCloseTab }: Props): JSX.Element {
  const { tabs, activeId, activeTab, setActive, moveTab, renameTab } = useTabStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const dragIndex = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const current = activeTab()
  const isDirty = current?.isDirty ?? false

  function handleDragStart(index: number): void {
    dragIndex.current = index
  }

  function handleDrop(index: number): void {
    if (dragIndex.current !== null && dragIndex.current !== index) {
      moveTab(dragIndex.current, index)
    }
    dragIndex.current = null
  }

  function handleWheel(e: React.WheelEvent): void {
    if (!scrollRef.current) return
    e.preventDefault()
    scrollRef.current.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX
  }

  return (
    <div className="tabbar" role="tablist">
      <div className="tabbar__left">
        <button
          type="button"
          className={`tabbar__sidebar-toggle${sidebarOpen ? ' is-open' : ''}`}
          onClick={toggleSidebar}
          title={sidebarOpen ? '사이드바 접기' : '사이드바 펼치기'}
          aria-label="사이드바 토글"
          aria-pressed={sidebarOpen}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d={ICON_SIDEBAR_TOGGLE} />
          </svg>
        </button>
      </div>

      <div className="tabbar__scroll" ref={scrollRef} onWheel={handleWheel}>
        {tabs.map((tab, i) => {
          // 이 탭을 제외한 다른 탭 이름 — Tab 내부 validateRename 검증에 사용
          const otherNames = tabs
            .filter((t) => t.id !== tab.id)
            .map((t) => t.fileName)
          return (
            <Tab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeId}
              existingNames={otherNames}
              onClick={() => setActive(tab.id)}
              onClose={() => onCloseTab(tab.id)}
              onRename={(name) => renameTab(tab.id, name)}
              onDragStart={() => handleDragStart(i)}
              onDrop={() => handleDrop(i)}
            />
          )
        })}
        <button
          className="tabbar__add"
          onClick={onNewTab}
          title="새 탭"
          aria-label="새 탭 추가"
        >
          +
        </button>
      </div>

      <div className="tabbar__right">
        <div
          className="tabbar__save-status"
          aria-label={isDirty ? '편집됨' : '저장됨'}
          title={isDirty ? '저장되지 않은 변경사항' : '모든 변경사항 저장됨'}
        >
          <span
            className={`tabbar__save-dot${isDirty ? ' is-dirty' : ''}`}
            aria-hidden
          />
          <span className="tabbar__save-text">
            {isDirty ? '편집됨' : '저장됨'}
          </span>
        </div>
        <CloudButton />
      </div>
    </div>
  )
}
