import { useState, useRef, useEffect, useCallback } from 'react'
import { appMenuData, MenuItem } from './menuData'
import './CustomMenu.css'

interface Props {
  activeMenu: string | null
  setActiveMenu: (id: string | null) => void
}

export function CustomMenu({ activeMenu, setActiveMenu }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [focusedMenuIndex, setFocusedMenuIndex] = useState<number | null>(null)
  
  // 햄버거 메뉴 모드인지 확인하는 로직 (단순화를 위해 activeMenu 상태를 활용하지만,
  // 실제로는 창 크기를 기반으로 동작하므로 데스크탑 메뉴 항목을 배열로 관리합니다)
  const desktopMenus = appMenuData

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (activeMenu && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveMenu(null)
        setFocusedMenuIndex(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeMenu, setActiveMenu])

  // Alt 키 및 방향키 네비게이션 처리
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // 윈도우 환경에서만 동작하도록 제한 (선택적)
      if (window.api.platform === 'darwin') return

      // Alt 키 단독으로 눌렀다 뗄 때 (focus 진입/해제)
      // Note: keydown에서 Alt를 감지하여 바로 포커스 처리
      if (e.key === 'Alt') {
        e.preventDefault()
        if (activeMenu || focusedMenuIndex !== null) {
          // 열려있으면 닫기
          setActiveMenu(null)
          setFocusedMenuIndex(null)
        } else {
          // 닫혀있으면 첫 번째 메뉴에 포커스 (열지는 않음, 또는 바로 열기)
          setFocusedMenuIndex(0)
          setActiveMenu(desktopMenus[0].id)
        }
        return
      }

      if (activeMenu || focusedMenuIndex !== null) {
        // 좌우 방향키로 최상위 메뉴 이동
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault()
          
          // 햄버거 메뉴 모드일 때는 좌우 이동 무시 (단순화)
          if (activeMenu === 'hamburger') return
          
          let currentIndex = desktopMenus.findIndex(m => m.id === activeMenu)
          if (currentIndex === -1) currentIndex = focusedMenuIndex ?? 0
          
          let nextIndex = currentIndex
          if (e.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % desktopMenus.length
          } else {
            nextIndex = (currentIndex - 1 + desktopMenus.length) % desktopMenus.length
          }
          
          setFocusedMenuIndex(nextIndex)
          // 이미 메뉴가 열려있다면 이동한 메뉴도 열기
          if (activeMenu) {
            setActiveMenu(desktopMenus[nextIndex].id)
          }
        }
        // 아래 화살표를 누르면 포커스된 메뉴 열기
        else if (e.key === 'ArrowDown' && !activeMenu && focusedMenuIndex !== null) {
          e.preventDefault()
          setActiveMenu(desktopMenus[focusedMenuIndex].id)
        }
        // Esc 누르면 닫기
        else if (e.key === 'Escape') {
          e.preventDefault()
          setActiveMenu(null)
          setFocusedMenuIndex(null)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeMenu, focusedMenuIndex, setActiveMenu, desktopMenus])

  const handleMenuClick = (id: string, index?: number) => {
    if (activeMenu === id) {
      setActiveMenu(null)
      setFocusedMenuIndex(null)
    } else {
      setActiveMenu(id)
      if (index !== undefined) setFocusedMenuIndex(index)
    }
  }

  const handleMenuHover = (id: string, index: number) => {
    if (activeMenu && activeMenu !== id && activeMenu !== 'hamburger') {
      setActiveMenu(id)
      setFocusedMenuIndex(index)
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
    setFocusedMenuIndex(null)
  }

  return (
    <div className="custom-menu" ref={containerRef}>
      {/* 햄버거 아이콘 (작은 화면에서만 표시) */}
      <div className="custom-menu__hamburger-container">
        <div
          className={`custom-menu__top-item custom-menu__hamburger ${activeMenu === 'hamburger' ? 'active' : ''}`}
          onClick={() => handleMenuClick('hamburger')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M2 4h12v1H2V4zm0 3h12v1H2V7zm0 3h12v1H2v-1z" clipRule="evenodd" />
          </svg>
        </div>
        {activeMenu === 'hamburger' && (
          <MenuDropdown 
            items={appMenuData.map(menu => ({
              label: menu.label,
              submenu: menu.items
            }))} 
            onItemClick={handleItemClick}
            closeMenu={() => { setActiveMenu(null); setFocusedMenuIndex(null); }}
          />
        )}
      </div>

      {/* 기본 메뉴 (큰 화면에서 표시) */}
      <div className="custom-menu__desktop-items">
        {desktopMenus.map((menu, index) => (
          <div
            key={menu.id}
            className="custom-menu__top-item-container"
            onMouseEnter={() => handleMenuHover(menu.id, index)}
          >
            <div
              className={`custom-menu__top-item ${activeMenu === menu.id || (focusedMenuIndex === index && !activeMenu) ? 'active' : ''}`}
              onClick={() => handleMenuClick(menu.id, index)}
            >
              {menu.label}
            </div>
            {activeMenu === menu.id && (
              <MenuDropdown 
                items={menu.items} 
                onItemClick={handleItemClick}
                closeMenu={() => { setActiveMenu(null); setFocusedMenuIndex(null); }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MenuDropdown({ items, onItemClick, closeMenu, isSubmenu = false }: { items: MenuItem[]; onItemClick: (item: MenuItem) => void; closeMenu: () => void; isSubmenu?: boolean }) {
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null)
  const [focusedIndex, setFocusedIndex] = useState<number>(0)
  
  // 드롭다운이 열릴 때 첫 번째 클릭 가능한 항목 찾기
  useEffect(() => {
    const firstClickable = items.findIndex(item => item.type !== 'separator')
    if (firstClickable !== -1) {
      setFocusedIndex(firstClickable)
    }
  }, [items])

  // 서브메뉴 키보드 네비게이션
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setFocusedIndex(prev => {
          let next = (prev + 1) % items.length
          while (items[next].type === 'separator' && next !== prev) {
            next = (next + 1) % items.length
          }
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setFocusedIndex(prev => {
          let next = (prev - 1 + items.length) % items.length
          while (items[next].type === 'separator' && next !== prev) {
            next = (next - 1 + items.length) % items.length
          }
          return next
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        const item = items[focusedIndex]
        if (item && item.type !== 'separator') {
          if (item.submenu) {
            setActiveSubmenu(focusedIndex)
          } else {
            onItemClick(item)
          }
        }
      } else if (e.key === 'ArrowRight') {
        const item = items[focusedIndex]
        if (item && item.submenu) {
          e.preventDefault()
          e.stopPropagation()
          setActiveSubmenu(focusedIndex)
        }
      } else if (e.key === 'ArrowLeft') {
        // 만약 이 컴포넌트가 최상위 메뉴가 연 서브메뉴라면 왼쪽 방향키로 닫히게 동작
        if (isSubmenu) {
          e.preventDefault()
          e.stopPropagation()
          closeMenu()
        }
        // 상위 메뉴라면 CustomMenu의 keydown 핸들러가 처리하도록 이벤트를 버블링
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeMenu()
      }
    }

    // 활성화된 자식 서브메뉴가 없을 때만 현재 뎁스에서 키보드 이벤트 처리
    if (activeSubmenu === null) {
      document.addEventListener('keydown', handleKeyDown, { capture: true })
      return () => document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [items, focusedIndex, activeSubmenu, onItemClick, closeMenu, isSubmenu])

  return (
    <div className="custom-menu__dropdown">
      {items.map((item, idx) => {
        if (item.type === 'separator') {
          return <div key={idx} className="custom-menu__separator" />
        }
        
        const hasSub = !!item.submenu
        const isFocused = focusedIndex === idx && activeSubmenu === null

        return (
          <div
            key={idx}
            className={`custom-menu__item ${isFocused ? 'focused' : ''}`}
            onMouseEnter={() => {
              setActiveSubmenu(hasSub ? idx : null)
              setFocusedIndex(idx)
            }}
            onClick={(e) => {
              if (hasSub) {
                e.stopPropagation()
                // 마우스 클릭 시 서브메뉴 토글 (열려있으면 그대로 둠)
                setActiveSubmenu(idx)
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
                <MenuDropdown 
                  items={item.submenu!} 
                  onItemClick={onItemClick}
                  closeMenu={() => setActiveSubmenu(null)}
                  isSubmenu={true}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
