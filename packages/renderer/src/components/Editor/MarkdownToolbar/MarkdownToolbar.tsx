import { useState, useRef, useEffect } from 'react'
import { EditorView } from '@codemirror/view'
import { useTranslation } from '../../../i18n'
import {
  wrapSelection,
  toggleLinePrefix,
  setHeading,
  insertCodeBlock,
  insertTable,
  insertLink,
  insertImage,
  insertHr,
  tableAddRow,
  tableDelRow,
  tableAddCol,
  tableDelCol,
} from '../markdownActions'
import './MarkdownToolbar.css'

interface Props {
  view: EditorView
}

// ── Remix Icon (Apache 2.0) — SVG paths ──

function icon(d: string): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d={d} />
    </svg>
  )
}

const icons = {
  heading:       icon('M13 20H11V13H4V20H2V4H4V11H11V4H13V20ZM21.0005 8V20H19.0005L19 10.204L17 10.74V8.67L19.5005 8H21.0005Z'),
  bold:          icon('M8 11H12.5C13.8807 11 15 9.88071 15 8.5C15 7.11929 13.8807 6 12.5 6H8V11ZM18 15.5C18 17.9853 15.9853 20 13.5 20H6V4H12.5C14.9853 4 17 6.01472 17 8.5C17 9.70431 16.5269 10.7981 15.7564 11.6058C17.0979 12.3847 18 13.837 18 15.5ZM8 13V18H13.5C14.8807 18 16 16.8807 16 15.5C16 14.1193 14.8807 13 13.5 13H8Z'),
  italic:        icon('M15 20H7V18H9.92661L12.0425 6H9V4H17V6H14.0734L11.9575 18H15V20Z'),
  strikethrough: icon('M17.1538 14C17.3846 14.5161 17.5 15.0893 17.5 15.7196C17.5 17.0625 16.9762 18.1116 15.9286 18.867C14.8809 19.6223 13.4335 20 11.5862 20C9.94674 20 8.32335 19.6185 6.71592 18.8555V16.6009C8.23538 17.4783 9.7908 17.917 11.3822 17.917C13.9333 17.917 15.2128 17.1846 15.2208 15.7196C15.2208 15.0939 15.0049 14.5598 14.5731 14.1173C14.5339 14.0772 14.4939 14.0381 14.4531 14H3V12H21V14H17.1538ZM13.076 11H7.62908C7.4566 10.8433 7.29616 10.6692 7.14776 10.4778C6.71592 9.92084 6.5 9.24559 6.5 8.45207C6.5 7.21602 6.96583 6.165 7.89749 5.299C8.82916 4.43299 10.2706 4 12.2219 4C13.6934 4 15.1009 4.32808 16.4444 4.98426V7.13591C15.2448 6.44921 13.9293 6.10587 12.4978 6.10587C10.0187 6.10587 8.77917 6.88793 8.77917 8.45207C8.77917 8.87172 8.99709 9.23796 9.43293 9.55079C9.86878 9.86362 10.4066 10.1135 11.0463 10.3004C11.6665 10.4816 12.3431 10.7148 13.076 11H13.076Z'),
  inlineCode:    icon('M23 12L15.9289 19.0711L14.5147 17.6569L20.1716 12L14.5147 6.34317L15.9289 4.92896L23 12ZM3.82843 12L9.48528 17.6569L8.07107 19.0711L1 12L8.07107 4.92896L9.48528 6.34317L3.82843 12Z'),
  codeBlock:     icon('M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM4 5V19H20V5H4ZM20 12L16.4645 15.5355L15.0503 14.1213L17.1716 12L15.0503 9.87868L16.4645 8.46447L20 12ZM6.82843 12L8.94975 14.1213L7.53553 15.5355L4 12L7.53553 8.46447L8.94975 9.87868L6.82843 12ZM11.2443 17H9.11597L12.7557 7H14.884L11.2443 17Z'),
  quote:         icon('M4.58341 17.3211C3.55316 16.2274 3 15 3 13.0103C3 9.51086 5.45651 6.37366 9.03059 4.82318L9.92328 6.20079C6.58804 8.00539 5.93618 10.346 5.67564 11.822C6.21263 11.5443 6.91558 11.4466 7.60471 11.5105C9.40908 11.6778 10.8312 13.159 10.8312 15C10.8312 16.933 9.26416 18.5 7.33116 18.5C6.2581 18.5 5.23196 18.0095 4.58341 17.3211ZM14.5834 17.3211C13.5532 16.2274 13 15 13 13.0103C13 9.51086 15.4565 6.37366 19.0306 4.82318L19.9233 6.20079C16.588 8.00539 15.9362 10.346 15.6756 11.822C16.2126 11.5443 16.9156 11.4466 17.6047 11.5105C19.4091 11.6778 20.8312 13.159 20.8312 15C20.8312 16.933 19.2642 18.5 17.3312 18.5C16.2581 18.5 15.232 18.0095 14.5834 17.3211Z'),
  listUl:        icon('M8 4H21V6H8V4ZM4.5 6.5C3.67157 6.5 3 5.82843 3 5C3 4.17157 3.67157 3.5 4.5 3.5C5.32843 3.5 6 4.17157 6 5C6 5.82843 5.32843 6.5 4.5 6.5ZM4.5 13.5C3.67157 13.5 3 12.8284 3 12C3 11.1716 3.67157 10.5 4.5 10.5C5.32843 10.5 6 11.1716 6 12C6 12.8284 5.32843 13.5 4.5 13.5ZM4.5 20.4C3.67157 20.4 3 19.7284 3 18.9C3 18.0716 3.67157 17.4 4.5 17.4C5.32843 17.4 6 18.0716 6 18.9C6 19.7284 5.32843 20.4 4.5 20.4ZM8 11H21V13H8V11ZM8 18H21V20H8V18Z'),
  listOl:        icon('M8 4H21V6H8V4ZM5 3V6H6V7H3V6H4V4H3V3H5ZM3 14V11.5H5V11H3V10H6V12.5H4V13H6V14H3ZM5 19.5H3V18.5H5V18H3V17H6V21H3V20H5V19.5ZM8 11H21V13H8V11ZM8 18H21V20H8V18Z'),
  taskList:      icon('M8 4H21V6H8V4ZM3 3.5H6V6.5H3V3.5ZM3 10.5H6V13.5H3V10.5ZM3 17.5H6V20.5H3V17.5ZM8 11H21V13H8V11ZM8 18H21V20H8V18Z'),
  link:          icon('M18.3638 15.5355L16.9496 14.1213L18.3638 12.7071C20.3164 10.7545 20.3164 7.58866 18.3638 5.63604C16.4112 3.68341 13.2453 3.68341 11.2927 5.63604L9.87849 7.05025L8.46428 5.63604L9.87849 4.22182C12.6122 1.48815 17.0443 1.48815 19.778 4.22182C22.5117 6.95549 22.5117 11.3876 19.778 14.1213L18.3638 15.5355ZM15.5353 18.364L14.1211 19.7782C11.3875 22.5118 6.95531 22.5118 4.22164 19.7782C1.48797 17.0445 1.48797 12.6123 4.22164 9.87868L5.63585 8.46446L7.05007 9.87868L5.63585 11.2929C3.68323 13.2455 3.68323 16.4113 5.63585 18.364C7.58847 20.3166 10.7543 20.3166 12.7069 18.364L14.1211 16.9497L15.5353 18.364ZM14.8282 7.75736L16.2425 9.17157L9.17139 16.2426L7.75717 14.8284L14.8282 7.75736Z'),
  image:         icon('M2.9918 21C2.44405 21 2 20.5551 2 20.0066V3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918ZM20 15V5H4V19L14 9L20 15ZM20 17.8284L14 11.8284L6.82843 19H20V17.8284ZM8 11C6.89543 11 6 10.1046 6 9C6 7.89543 6.89543 7 8 7C9.10457 7 10 7.89543 10 9C10 10.1046 9.10457 11 8 11Z'),
  table:         icon('M13 10V14H19V10H13ZM11 10H5V14H11V10ZM13 19H19V16H13V19ZM11 19V16H5V19H11ZM13 5V8H19V5H13ZM11 5H5V8H11V5ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3Z'),
  hr:            icon('M2 11H4V13H2V11ZM6 11H18V13H6V11ZM20 11H22V13H20V11Z'),
  // table sub-actions
  insertRowTop:  icon('M20 13C20.5523 13 21 13.4477 21 14V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V14C3 13.4477 3.44772 13 4 13H20ZM19 15H5V19H19V15ZM12 1C14.7614 1 17 3.23858 17 6C17 8.76142 14.7614 11 12 11C9.23858 11 7 8.76142 7 6C7 3.23858 9.23858 1 12 1ZM13 3H11V4.999L9 5V7L11 6.999V9H13V6.999L15 7V5L13 4.999V3Z'),
  insertRowBot:  icon('M12 13C14.7614 13 17 15.2386 17 18C17 20.7614 14.7614 23 12 23C9.23858 23 7 20.7614 7 18C7 15.2386 9.23858 13 12 13ZM13 15H11V16.999L9 17V19L11 18.999V21H13V18.999L15 19V17L13 16.999V15ZM20 3C20.5523 3 21 3.44772 21 4V10C21 10.5523 20.5523 11 20 11H4C3.44772 11 3 10.5523 3 10V4C3 3.44772 3.44772 3 4 3H20ZM5 5V9H19V5H5Z'),
  insertColLeft: icon('M20 3C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H14C13.4477 21 13 20.5523 13 20V4C13 3.44772 13.4477 3 14 3H20ZM19 5H15V19H19V5ZM6 7C8.76142 7 11 9.23858 11 12C11 14.7614 8.76142 17 6 17C3.23858 17 1 14.7614 1 12C1 9.23858 3.23858 7 6 7ZM7 9H5V10.999L3 11V13L5 12.999V15H7V12.999L9 13V11L7 10.999V9Z'),
  insertColRight:icon('M10 3C10.5523 3 11 3.44772 11 4V20C11 20.5523 10.5523 21 10 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3H10ZM9 5H5V19H9V5ZM18 7C20.7614 7 23 9.23858 23 12C23 14.7614 20.7614 17 18 17C15.2386 17 13 14.7614 13 12C13 9.23858 15.2386 7 18 7ZM19 9H17V10.999L15 11V13L17 12.999V15H19V12.999L21 13V11L19 10.999V9Z'),
  deleteRow:     icon('M20 5C20.5523 5 21 5.44772 21 6V12C21 12.5523 20.5523 13 20 13C20.628 13.8355 21 14.8743 21 16C21 18.7614 18.7614 21 16 21C13.2386 21 11 18.7614 11 16C11 14.8743 11.372 13.8355 11.9998 12.9998L4 13C3.44772 13 3 12.5523 3 12V6C3 5.44772 3.44772 5 4 5H20ZM13 15V17H19V15H13ZM19 7H5V11H19V7Z'),
  deleteCol:     icon('M12 3C12.5523 3 13 3.44772 13 4L12.9998 11.9998C13.8355 11.372 14.8743 11 16 11C18.7614 11 21 13.2386 21 16C21 18.7614 18.7614 21 16 21C14.9681 21 14.0092 20.6874 13.2129 20.1518L13 20C13 20.5523 12.5523 21 12 21H6C5.44772 21 5 20.5523 5 20V4C5 3.44772 5.44772 3 6 3H12ZM11 5H7V19H11V5ZM19 15H13V17H19V15Z'),
  addTable:      icon('M4 8H20V5H4V8ZM14 19V10H10V19H14ZM16 19H20V10H16V19ZM8 19V10H4V19H8ZM3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3Z'),
  // dropdown caret
  chevron:       icon('M12 15.0006L7.75732 10.758L9.17154 9.34375L12 12.1722L14.8284 9.34375L16.2426 10.758L12 15.0006Z'),
}

// ── Shortcut hint helper ──

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)
const mod = isMac ? '\u2318' : 'Ctrl+'

function shortcut(key: string): string {
  return ` (${mod}${key})`
}

// ── Dropdown button component ──

function DropdownButton({ icon: iconEl, title, children }: {
  icon: JSX.Element
  title: string
  children: JSX.Element[]
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const timeout = useRef<ReturnType<typeof setTimeout>>()
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const show = () => {
    clearTimeout(timeout.current)
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 2, left: rect.left })
    }
    setOpen(true)
  }
  const hide = () => { timeout.current = setTimeout(() => setOpen(false), 150) }

  useEffect(() => () => clearTimeout(timeout.current), [])

  return (
    <div
      className="md-toolbar__dropdown"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        ref={btnRef}
        className="md-toolbar__btn md-toolbar__btn--dropdown"
        title={title}
        onMouseDown={e => e.preventDefault()}
      >
        {iconEl}
        <span className="md-toolbar__chevron">{icons.chevron}</span>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="md-toolbar__menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ── Main component ──

export function MarkdownToolbar({ view }: Props): JSX.Element {
  const t = useTranslation().toolbar

  return (
    <div className="md-toolbar">
      {/* Heading dropdown */}
      <DropdownButton icon={icons.heading} title={t.heading}>
        {([1, 2, 3, 4, 5] as const).map(level => (
          <button
            key={level}
            className="md-toolbar__menu-item"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { setHeading(view, level); }}
          >
            <span className={`md-toolbar__h md-toolbar__h--${level}`}>H{level}</span>
            <span className="md-toolbar__h-label">
              {t[`h${level}` as keyof typeof t]}
            </span>
          </button>
        ))}
      </DropdownButton>

      <button className="md-toolbar__btn" title={t.bold + shortcut('B')} onMouseDown={e => e.preventDefault()} onClick={() => wrapSelection(view, '**', '**')}>{icons.bold}</button>
      <button className="md-toolbar__btn" title={t.italic + shortcut('I')} onMouseDown={e => e.preventDefault()} onClick={() => wrapSelection(view, '*', '*')}>{icons.italic}</button>
      <button className="md-toolbar__btn" title={t.strikethrough + shortcut(isMac ? '\u21E7X' : 'Shift+X')} onMouseDown={e => e.preventDefault()} onClick={() => wrapSelection(view, '~~', '~~')}>{icons.strikethrough}</button>
      <button className="md-toolbar__btn" title={t.inlineCode} onMouseDown={e => e.preventDefault()} onClick={() => wrapSelection(view, '`', '`')}>{icons.inlineCode}</button>
      <button className="md-toolbar__btn" title={t.codeBlock} onMouseDown={e => e.preventDefault()} onClick={() => insertCodeBlock(view)}>{icons.codeBlock}</button>

      <div className="md-toolbar__sep" />

      <button className="md-toolbar__btn" title={t.blockquote} onMouseDown={e => e.preventDefault()} onClick={() => toggleLinePrefix(view, '> ')}>{icons.quote}</button>
      <button className="md-toolbar__btn" title={t.unorderedList} onMouseDown={e => e.preventDefault()} onClick={() => toggleLinePrefix(view, '- ')}>{icons.listUl}</button>
      <button className="md-toolbar__btn" title={t.orderedList} onMouseDown={e => e.preventDefault()} onClick={() => toggleLinePrefix(view, '1. ')}>{icons.listOl}</button>
      <button className="md-toolbar__btn" title={t.taskList} onMouseDown={e => e.preventDefault()} onClick={() => toggleLinePrefix(view, '- [ ] ')}>{icons.taskList}</button>

      <div className="md-toolbar__sep" />

      <button className="md-toolbar__btn" title={t.link + shortcut('K')} onMouseDown={e => e.preventDefault()} onClick={() => insertLink(view)}>{icons.link}</button>
      <button className="md-toolbar__btn" title={t.image} onMouseDown={e => e.preventDefault()} onClick={() => insertImage(view)}>{icons.image}</button>

      {/* Table dropdown */}
      <DropdownButton icon={icons.table} title={t.table}>
        {[
          { icon: icons.addTable, label: t.table, action: () => insertTable(view) },
          null,
          { icon: icons.insertRowTop, label: t.tableAddRowAbove, action: () => tableAddRow(view, 'above') },
          { icon: icons.insertRowBot, label: t.tableAddRowBelow, action: () => tableAddRow(view, 'below') },
          { icon: icons.insertColLeft, label: t.tableAddColLeft, action: () => tableAddCol(view, 'left') },
          { icon: icons.insertColRight, label: t.tableAddColRight, action: () => tableAddCol(view, 'right') },
          null,
          { icon: icons.deleteRow, label: t.tableDelRow, action: () => tableDelRow(view) },
          { icon: icons.deleteCol, label: t.tableDelCol, action: () => tableDelCol(view) },
        ].map((item, i) =>
          item === null ? (
            <div key={i} className="md-toolbar__menu-sep" />
          ) : (
            <button
              key={i}
              className="md-toolbar__menu-item"
              onMouseDown={e => e.preventDefault()}
              onClick={item.action}
            >
              <span className="md-toolbar__menu-icon">{item.icon}</span>
              {item.label}
            </button>
          )
        )}
      </DropdownButton>

      <button className="md-toolbar__btn" title={t.horizontalRule} onMouseDown={e => e.preventDefault()} onClick={() => insertHr(view)}>{icons.hr}</button>
    </div>
  )
}
