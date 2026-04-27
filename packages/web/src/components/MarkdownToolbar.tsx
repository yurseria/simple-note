'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Heading, Bold, Italic, Strikethrough, Code, Code2,
  Quote, List, ListOrdered, ListChecks, Link, Image,
  Table, Minus, ChevronDown,
} from 'lucide-react'
import { useT } from '../lib/i18n'
import './MarkdownToolbar.css'

type OpFn = (value: string, selStart: number, selEnd: number) => [string, number, number]

interface Props {
  onApply: (fn: OpFn) => void
}

// ── Text operations ──

function opWrap(v: string, s: number, e: number, before: string, after: string, defaultText: string): [string, number, number] {
  if (s !== e) {
    const sel = v.slice(s, e)
    // 선택 범위 자체에 마커가 포함된 경우: **text** → text
    if (sel.startsWith(before) && sel.endsWith(after) && sel.length >= before.length + after.length) {
      const inner = sel.slice(before.length, sel.length - after.length)
      return [v.slice(0, s) + inner + v.slice(e), s, s + inner.length]
    }
    // 마커가 선택 범위 바깥에 있는 경우: [**]text[**] → text
    if (s >= before.length && v.slice(s - before.length, s) === before && v.slice(e, e + after.length) === after) {
      return [v.slice(0, s - before.length) + sel + v.slice(e + after.length), s - before.length, s - before.length + sel.length]
    }
  }
  const text = s !== e ? v.slice(s, e) : defaultText
  return [v.slice(0, s) + before + text + after + v.slice(e), s + before.length, s + before.length + text.length]
}

function opLinePrefix(v: string, s: number, e: number, prefix: string): [string, number, number] {
  const lineStart = v.lastIndexOf('\n', s - 1) + 1
  const lineEndRaw = v.indexOf('\n', e > 0 ? e - 1 : 0)
  const lineEnd = lineEndRaw < 0 ? v.length : lineEndRaw
  const block = v.slice(lineStart, lineEnd)
  const lines = block.split('\n')
  const allHave = lines.every((l) => l.startsWith(prefix))
  const newBlock = lines.map((l) => allHave ? l.slice(prefix.length) : prefix + l).join('\n')
  return [v.slice(0, lineStart) + newBlock + v.slice(lineEnd), lineStart, lineStart + newBlock.length]
}

function opHeading(v: string, s: number, _e: number, level: number): [string, number, number] {
  const lineStart = v.lastIndexOf('\n', s - 1) + 1
  const lineEndRaw = v.indexOf('\n', lineStart)
  const lineEnd = lineEndRaw < 0 ? v.length : lineEndRaw
  const line = v.slice(lineStart, lineEnd)
  const stripped = line.replace(/^#{1,6}\s*/, '')
  const prefix = '#'.repeat(level) + ' '
  const newLine = prefix + stripped
  return [v.slice(0, lineStart) + newLine + v.slice(lineEnd), lineStart + prefix.length, lineStart + newLine.length]
}

function opCodeBlock(v: string, s: number, e: number): [string, number, number] {
  const sel = v.slice(s, e)
  const block = `\`\`\`\n${sel}\n\`\`\``
  return [v.slice(0, s) + block + v.slice(e), s + 4, s + 4 + sel.length]
}

function opLink(v: string, s: number, e: number, linkText: string): [string, number, number] {
  const text = s !== e ? v.slice(s, e) : linkText
  const md = `[${text}](url)`
  return [v.slice(0, s) + md + v.slice(e), s + text.length + 3, s + text.length + 6]
}

function opImage(v: string, s: number, e: number): [string, number, number] {
  const alt = s !== e ? v.slice(s, e) : 'alt'
  const md = `![${alt}](url)`
  return [v.slice(0, s) + md + v.slice(e), s + alt.length + 4, s + alt.length + 7]
}

function opTable(v: string, s: number, _e: number, template: string): [string, number, number] {
  return [v.slice(0, s) + template + v.slice(s), s + 2, s + 2]
}

function opHr(v: string, s: number, _e: number): [string, number, number] {
  const hr = '\n\n---\n\n'
  return [v.slice(0, s) + hr + v.slice(s), s + hr.length, s + hr.length]
}

// ── Dropdown component ──

function DropdownButton({ icon, title, children }: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent): void {
      if (menuRef.current?.contains(e.target as Node)) return
      if (btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function handleToggle(): void {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.top - 2, left: rect.left })
    }
    setOpen((v) => !v)
  }

  return (
    <div className="md-toolbar__dropdown">
      <button
        ref={btnRef}
        className="md-toolbar__btn md-toolbar__btn--dropdown"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleToggle}
        type="button"
      >
        {icon}
        <span className="md-toolbar__chevron"><ChevronDown /></span>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="md-toolbar__menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ── Shortcut hint ──

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)
const mod = isMac ? '⌘' : 'Ctrl+'

function shortcut(key: string): string {
  return ` (${mod}${key})`
}

// ── Main component ──

export function MarkdownToolbar({ onApply }: Props): JSX.Element {
  const t = useT()
  const [kbOffset, setKbOffset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = (): void => {
      const raw = Math.round(window.innerHeight - vv.height)
      setKbOffset(raw > 80 ? raw : 0)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  const headingLabels = t.mdHeadingLabels
  const defaultText = t.mdDefaultText
  const linkText = t.mdLinkText
  const tableTemplate = t.mdTableTemplate

  function wrap(before: string, after: string): void {
    onApply((v, s, e) => opWrap(v, s, e, before, after, defaultText))
  }
  function linePrefix(prefix: string): void {
    onApply((v, s, e) => opLinePrefix(v, s, e, prefix))
  }

  return (
    <div className="md-toolbar" style={kbOffset > 0 ? { bottom: kbOffset } : undefined}>
      <DropdownButton icon={<Heading />} title={t.mdHeading}>
        {([1, 2, 3, 4, 5] as const).map((level) => (
          <button
            key={level}
            className="md-toolbar__menu-item"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onApply((v, s, e) => opHeading(v, s, e, level))}
            type="button"
          >
            <span className={`md-toolbar__h md-toolbar__h--${level}`}>H{level}</span>
            <span className="md-toolbar__h-label">{headingLabels[level - 1]}</span>
          </button>
        ))}
      </DropdownButton>

      <button className="md-toolbar__btn" title={t.mdBold + shortcut('B')} onMouseDown={(e) => e.preventDefault()} onClick={() => wrap('**', '**')} type="button"><Bold /></button>
      <button className="md-toolbar__btn" title={t.mdItalic + shortcut('I')} onMouseDown={(e) => e.preventDefault()} onClick={() => wrap('*', '*')} type="button"><Italic /></button>
      <button className="md-toolbar__btn" title={t.mdStrikethrough} onMouseDown={(e) => e.preventDefault()} onClick={() => wrap('~~', '~~')} type="button"><Strikethrough /></button>
      <button className="md-toolbar__btn" title={t.mdInlineCode} onMouseDown={(e) => e.preventDefault()} onClick={() => wrap('`', '`')} type="button"><Code /></button>
      <button className="md-toolbar__btn" title={t.mdCodeBlock} onMouseDown={(e) => e.preventDefault()} onClick={() => onApply(opCodeBlock)} type="button"><Code2 /></button>

      <div className="md-toolbar__sep" />

      <button className="md-toolbar__btn" title={t.mdQuote} onMouseDown={(e) => e.preventDefault()} onClick={() => linePrefix('> ')} type="button"><Quote /></button>
      <button className="md-toolbar__btn" title={t.mdListUl} onMouseDown={(e) => e.preventDefault()} onClick={() => linePrefix('- ')} type="button"><List /></button>
      <button className="md-toolbar__btn" title={t.mdListOl} onMouseDown={(e) => e.preventDefault()} onClick={() => linePrefix('1. ')} type="button"><ListOrdered /></button>
      <button className="md-toolbar__btn" title={t.mdTaskList} onMouseDown={(e) => e.preventDefault()} onClick={() => linePrefix('- [ ] ')} type="button"><ListChecks /></button>

      <div className="md-toolbar__sep" />

      <button className="md-toolbar__btn" title={t.mdLink + shortcut('K')} onMouseDown={(e) => e.preventDefault()} onClick={() => onApply((v, s, e) => opLink(v, s, e, linkText))} type="button"><Link /></button>
      <button className="md-toolbar__btn" title={t.mdImage} onMouseDown={(e) => e.preventDefault()} onClick={() => onApply(opImage)} type="button"><Image /></button>

      <DropdownButton icon={<Table />} title={t.mdTable}>
        <button
          className="md-toolbar__menu-item"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onApply((v, s, e) => opTable(v, s, e, tableTemplate))}
          type="button"
        >
          <span className="md-toolbar__menu-icon"><Table /></span>
          {t.mdTable}
        </button>
      </DropdownButton>

      <button className="md-toolbar__btn" title={t.mdHr} onMouseDown={(e) => e.preventDefault()} onClick={() => onApply(opHr)} type="button"><Minus /></button>
    </div>
  )
}
