import { useState, useEffect, useRef, useMemo } from 'react'
import { getAppMenuData, type MenuItem } from '../TitleBar/menuData'
import { useTranslation } from '../../i18n'
import { en } from '../../i18n/en'
import { ko } from '../../i18n/ko'
import { api } from '../../platform'
import { parseMnemonic } from '../TitleBar/CustomMenu'
import './CommandPalette.css'

interface Command {
  label: string
  category: string
  accelerator?: string
  /** 검색용 키워드 — 현재 언어 + 반대 언어 라벨 포함 */
  searchText: string
  execute: () => void
}

interface Props {
  onClose: () => void
  onAction: (action: string, payload?: string) => void
}

/** 메뉴 데이터에서 실행 가능한 명령만 평탄화 */
function flattenMenuCommands(
  items: MenuItem[],
  altItems: MenuItem[],
  category: string,
  altCategory: string,
  onAction: (action: string, payload?: string) => void,
): Command[] {
  const commands: Command[] = []
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx]
    const altItem = altItems[idx]
    if (item.type === 'separator') continue
    if (item.submenu) {
      const altSub = (altItem && altItem.type !== 'separator' && altItem.submenu) ? altItem.submenu : item.submenu
      commands.push(...flattenMenuCommands(
        item.submenu, altSub,
        parseMnemonic(item.label).text,
        parseMnemonic(altItem && altItem.type !== 'separator' ? altItem.label : item.label).text,
        onAction,
      ))
      continue
    }
    if (!item.action && !item.role) continue
    const label = parseMnemonic(item.label).text
    const cat = parseMnemonic(category).text
    const altLabel = altItem && altItem.type !== 'separator' ? parseMnemonic(altItem.label).text : ''
    const altCat = parseMnemonic(altCategory).text
    commands.push({
      label,
      category: cat,
      accelerator: item.accelerator,
      searchText: [label, cat, altLabel, altCat].join(' ').toLowerCase(),
      execute: () => {
        if (item.action) {
          onAction(item.action, item.actionArgs?.[0] as string | undefined)
        } else if (item.role) {
          api.menu.executeRole(item.role)
        }
      },
    })
  }
  return commands
}

export function CommandPalette({ onClose, onAction }: Props): JSX.Element {
  const t = useTranslation()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 현재 언어 메뉴 + 반대 언어 메뉴를 함께 빌드해서 검색 키워드로 사용
  const allCommands = useMemo(() => {
    const alt = t === ko ? en : ko
    const menus = getAppMenuData(t)
    const altMenus = getAppMenuData(alt)
    const cmds: Command[] = []
    for (let i = 0; i < menus.length; i++) {
      cmds.push(...flattenMenuCommands(
        menus[i].items, altMenus[i]?.items ?? menus[i].items,
        menus[i].label, altMenus[i]?.label ?? menus[i].label,
        onAction,
      ))
    }
    return cmds
  }, [t, onAction])

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands
    const q = query.toLowerCase()
    return allCommands.filter((cmd) => cmd.searchText.includes(q))
  }, [query, allCommands])

  // 쿼리 변경 시 선택 초기화
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // 선택 항목이 보이도록 스크롤
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // 마운트 시 포커스
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % Math.max(1, filtered.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(1, filtered.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].execute()
        onClose()
      }
    }
  }

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <input
          ref={inputRef}
          className="cp__input"
          type="text"
          placeholder={t.commandPalette.placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="cp__list" ref={listRef}>
          {filtered.length === 0 && (
            <div className="cp__empty">{t.commandPalette.noResults}</div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={`${cmd.category}-${cmd.label}-${i}`}
              className={`cp__item ${i === selectedIndex ? 'cp__item--selected' : ''}`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => {
                cmd.execute()
                onClose()
              }}
            >
              <span className="cp__item-category">{cmd.category}</span>
              <span className="cp__item-label">{cmd.label}</span>
              {cmd.accelerator && (
                <span className="cp__item-accel">{cmd.accelerator}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
