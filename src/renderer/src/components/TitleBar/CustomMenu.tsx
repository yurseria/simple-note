import { useState, useRef, useEffect } from 'react'
import { appMenuData, MenuItem } from './menuData'
import './CustomMenu.css'

interface Props {
  activeMenu: string | null
  setActiveMenu: (id: string | null) => void
}

export function CustomMenu({ activeMenu, setActiveMenu }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (activeMenu && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeMenu, setActiveMenu])

  const handleMenuClick = (id: string) => {
    setActiveMenu(activeMenu === id ? null : id)
  }

  const handleMenuHover = (id: string) => {
    if (activeMenu && activeMenu !== id) {
      setActiveMenu(id)
    }
  }

  const handleItemClick = (item: MenuItem) => {
    if (item.type === 'separator' || item.submenu) return

    if (item.action) {
      window.api.menu.trigger(item.action, ...(item.actionArgs || []))
    } else if (item.role) {
      window.api.menu.role(item.role)
    }
    setActiveMenu(null)
  }

  return (
    <div className="custom-menu" ref={containerRef}>
      {appMenuData.map((menu) => (
        <div
          key={menu.id}
          className="custom-menu__top-item-container"
          onMouseEnter={() => handleMenuHover(menu.id)}
        >
          <div
            className={`custom-menu__top-item ${activeMenu === menu.id ? 'active' : ''}`}
            onClick={() => handleMenuClick(menu.id)}
          >
            {menu.label}
          </div>
          {activeMenu === menu.id && (
            <MenuDropdown items={menu.items} onItemClick={handleItemClick} />
          )}
        </div>
      ))}
    </div>
  )
}

function MenuDropdown({ items, onItemClick }: { items: MenuItem[]; onItemClick: (item: MenuItem) => void }) {
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null)

  return (
    <div className="custom-menu__dropdown">
      {items.map((item, idx) => {
        if (item.type === 'separator') {
          return <div key={idx} className="custom-menu__separator" />
        }
        
        const hasSub = !!item.submenu

        return (
          <div
            key={idx}
            className="custom-menu__item"
            onMouseEnter={() => setActiveSubmenu(hasSub ? idx : null)}
            onClick={(e) => {
              if (hasSub) {
                e.stopPropagation()
              } else {
                onItemClick(item)
              }
            }}
          >
            <span className="custom-menu__item-label">{item.label}</span>
            {item.accelerator && <span className="custom-menu__item-accel">{item.accelerator}</span>}
            {hasSub && <span className="custom-menu__item-arrow">▶</span>}
            
            {hasSub && activeSubmenu === idx && (
              <div className="custom-menu__submenu">
                <MenuDropdown items={item.submenu!} onItemClick={onItemClick} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
