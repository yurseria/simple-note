import { useRef } from 'react'
import { useTabStore } from '../../store/tabStore'
import { Tab } from './Tab'
import './TabBar.css'

interface Props {
  onNewTab: () => void
  onCloseTab: (id: string) => void
}

export function TabBar({ onNewTab, onCloseTab }: Props): JSX.Element {
  const { tabs, activeId, setActive, moveTab, renameTab } = useTabStore()
  const dragIndex = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

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
      <div className="tabbar__scroll" ref={scrollRef} onWheel={handleWheel}>
        {tabs.map((tab, i) => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeId}
            onClick={() => setActive(tab.id)}
            onClose={() => onCloseTab(tab.id)}
            onRename={(name) => renameTab(tab.id, name)}
            onDragStart={() => handleDragStart(i)}
            onDrop={() => handleDrop(i)}
          />
        ))}
      </div>
      <button className="tabbar__add" onClick={onNewTab} title="새 탭" aria-label="새 탭 추가">
        +
      </button>
    </div>
  )
}
