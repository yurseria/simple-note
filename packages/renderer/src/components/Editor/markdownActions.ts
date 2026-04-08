import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

// ── Inline / wrap formatting ──

export function wrapSelection(view: EditorView, prefix: string, suffix: string) {
  const { state } = view
  const { from, to } = state.selection.main
  const selected = state.sliceDoc(from, to)

  if (selected.startsWith(prefix) && selected.endsWith(suffix)) {
    const inner = selected.slice(prefix.length, selected.length - suffix.length)
    view.dispatch({
      changes: { from, to, insert: inner },
      selection: EditorSelection.single(from, from + inner.length),
    })
    view.focus()
    return
  }

  const beforeFrom = Math.max(0, from - prefix.length)
  const afterTo = Math.min(state.doc.length, to + suffix.length)
  const before = state.sliceDoc(beforeFrom, from)
  const after = state.sliceDoc(to, afterTo)
  if (before === prefix && after === suffix) {
    view.dispatch({
      changes: [
        { from: beforeFrom, to: from, insert: '' },
        { from: to, to: afterTo, insert: '' },
      ],
      selection: EditorSelection.single(beforeFrom, beforeFrom + selected.length),
    })
    view.focus()
    return
  }

  const wrapped = prefix + selected + suffix
  view.dispatch({
    changes: { from, to, insert: wrapped },
    selection: EditorSelection.single(from + prefix.length, from + prefix.length + selected.length),
  })
  view.focus()
}

// ── Line-prefix toggling ──

export function toggleLinePrefix(view: EditorView, prefix: string) {
  const { state } = view
  const { from, to } = state.selection.main
  const fromLine = state.doc.lineAt(from)
  const toLine = state.doc.lineAt(to)

  const changes: { from: number; to: number; insert: string }[] = []
  let allHavePrefix = true

  for (let i = fromLine.number; i <= toLine.number; i++) {
    if (!state.doc.line(i).text.startsWith(prefix)) { allHavePrefix = false; break }
  }

  for (let i = fromLine.number; i <= toLine.number; i++) {
    const line = state.doc.line(i)
    if (allHavePrefix) {
      changes.push({ from: line.from, to: line.from + prefix.length, insert: '' })
    } else {
      changes.push({ from: line.from, to: line.from, insert: prefix })
    }
  }

  view.dispatch({ changes })
  view.focus()
}

// ── Headings ──

export function setHeading(view: EditorView, level: number) {
  const { state } = view
  const line = state.doc.lineAt(state.selection.main.head)
  const match = line.text.match(/^(#{1,6})\s/)
  const prefix = '#'.repeat(level) + ' '

  if (match) {
    view.dispatch({ changes: { from: line.from, to: line.from + match[0].length, insert: prefix } })
  } else {
    view.dispatch({ changes: { from: line.from, to: line.from, insert: prefix } })
  }
  view.focus()
}

// ── Code block ──

export function insertCodeBlock(view: EditorView) {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const line = view.state.doc.lineAt(from)
  const prefix = line.text.trim() === '' && from === line.from ? '' : '\n'
  const insert = `${prefix}\`\`\`\n${selected}\n\`\`\`\n`
  const cursorPos = from + prefix.length + 3 // after opening ```
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(cursorPos),
  })
  view.focus()
}

// ── Table insert ──

export function insertTable(view: EditorView) {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const prefix = line.text.trim() === '' ? '' : '\n'
  const table = `${prefix}| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n|  |  |  |\n`
  view.dispatch({
    changes: { from: pos, insert: table },
    selection: EditorSelection.cursor(pos + prefix.length + '| '.length),
  })
  view.focus()
}

// ── Table context detection ──

export function getTableContext(view: EditorView) {
  const { state } = view
  const pos = state.selection.main.head
  const curLine = state.doc.lineAt(pos)

  if (!curLine.text.trim().startsWith('|')) return null

  let startLine = curLine.number
  while (startLine > 1) {
    const prev = state.doc.line(startLine - 1)
    if (!prev.text.trim().startsWith('|')) break
    startLine--
  }

  let endLine = curLine.number
  while (endLine < state.doc.lines) {
    const next = state.doc.line(endLine + 1)
    if (!next.text.trim().startsWith('|')) break
    endLine++
  }

  if (endLine - startLine < 1) return null
  const sepLine = state.doc.line(startLine + 1)
  if (!/^\|[\s:|-]+\|$/.test(sepLine.text.trim())) return null

  const curRowIdx = curLine.number - startLine
  const colCount = state.doc.line(startLine).text.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).length

  return { startLine, endLine, curRowIdx, colCount, curLineNum: curLine.number }
}

// ── Table row operations ──

export function tableAddRow(view: EditorView, direction: 'above' | 'below') {
  const ctx = getTableContext(view)
  if (!ctx) return
  const { state } = view
  const { colCount, curLineNum, startLine } = ctx

  const isSepRow = curLineNum === startLine + 1
  const targetLineNum = direction === 'above'
    ? (isSepRow || curLineNum === startLine ? startLine + 2 : curLineNum)
    : (isSepRow ? startLine + 2 : curLineNum)

  const emptyRow = '| ' + Array(colCount).fill(' ').join(' | ') + ' |\n'
  const targetLine = state.doc.line(targetLineNum)
  const insertPos = direction === 'above' ? targetLine.from : targetLine.to + 1

  view.dispatch({ changes: { from: insertPos, insert: emptyRow } })
  view.focus()
}

export function tableDelRow(view: EditorView) {
  const ctx = getTableContext(view)
  if (!ctx) return
  const { state } = view
  const { curLineNum, startLine, endLine } = ctx

  if (curLineNum <= startLine + 1) return
  if (endLine - (startLine + 1) <= 1) return

  const line = state.doc.line(curLineNum)
  const from = line.from
  const to = Math.min(line.to + 1, state.doc.length)
  view.dispatch({ changes: { from, to } })
  view.focus()
}

// ── Table column operations ──

export function tableAddCol(view: EditorView, direction: 'left' | 'right') {
  const ctx = getTableContext(view)
  if (!ctx) return
  const { state } = view
  const { startLine, endLine, colCount } = ctx

  const cursorPos = state.selection.main.head
  const headerLine = state.doc.line(startLine)
  let curCol = 0
  let pipeCount = 0
  for (let j = 0; j < headerLine.text.length; j++) {
    if (headerLine.text[j] === '|') {
      pipeCount++
      if (pipeCount > 1 && headerLine.from + j >= cursorPos) break
      if (pipeCount > 1) curCol++
    }
  }
  const curLine = state.doc.lineAt(cursorPos)
  if (curLine.number !== startLine) {
    curCol = 0
    pipeCount = 0
    for (let j = 0; j < curLine.text.length; j++) {
      if (curLine.text[j] === '|') {
        pipeCount++
        if (pipeCount > 1 && curLine.from + j >= cursorPos) break
        if (pipeCount > 1) curCol++
      }
    }
  }
  if (curCol >= colCount) curCol = colCount - 1

  const spliceIdx = direction === 'left' ? curCol + 1 : curCol + 2

  const changes: { from: number; to: number; insert: string }[] = []
  for (let i = startLine; i <= endLine; i++) {
    const line = state.doc.line(i)
    const parts = line.text.split('|')
    const isSep = i === startLine + 1
    const newCell = isSep ? ' --- ' : '  '
    parts.splice(spliceIdx, 0, newCell)
    changes.push({ from: line.from, to: line.to, insert: parts.join('|') })
  }

  view.dispatch({ changes })
  view.focus()
}

export function tableDelCol(view: EditorView) {
  const ctx = getTableContext(view)
  if (!ctx || ctx.colCount <= 1) return
  const { state } = view
  const { startLine, endLine, colCount } = ctx

  const cursorPos = state.selection.main.head
  const curLine = state.doc.lineAt(cursorPos)
  let curCol = 0
  let pipeCount = 0
  for (let j = 0; j < curLine.text.length; j++) {
    if (curLine.text[j] === '|') {
      pipeCount++
      if (pipeCount > 1 && curLine.from + j >= cursorPos) break
      if (pipeCount > 1) curCol++
    }
  }
  if (curCol >= colCount) curCol = colCount - 1

  const changes: { from: number; to: number; insert: string }[] = []
  for (let i = startLine; i <= endLine; i++) {
    const line = state.doc.line(i)
    const parts = line.text.split('|')
    if (curCol + 1 < parts.length) {
      parts.splice(curCol + 1, 1)
    }
    changes.push({ from: line.from, to: line.to, insert: parts.join('|') })
  }

  view.dispatch({ changes })
  view.focus()
}

// ── Link / Image / HR ──

export function insertLink(view: EditorView) {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  if (/^https?:\/\//.test(selected)) {
    view.dispatch({ changes: { from, to, insert: `[](${selected})` }, selection: EditorSelection.cursor(from + 1) })
  } else {
    const insert = `[${selected}](url)`
    const urlFrom = from + selected.length + 3
    view.dispatch({ changes: { from, to, insert }, selection: EditorSelection.single(urlFrom, urlFrom + 3) })
  }
  view.focus()
}

export function insertImage(view: EditorView) {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const insert = `![${selected || 'alt'}](url)`
  const urlFrom = from + (selected || 'alt').length + 4
  view.dispatch({ changes: { from, to, insert }, selection: EditorSelection.single(urlFrom, urlFrom + 3) })
  view.focus()
}

export function insertHr(view: EditorView) {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const prefix = line.text.trim() === '' ? '' : '\n'
  view.dispatch({ changes: { from: pos, insert: `${prefix}---\n` } })
  view.focus()
}

// ── CSV / TSV → Markdown table conversion ──

function parseCsvLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') return line.split('\t')

  // CSV: handle quoted fields
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (inQuotes) {
      if (ch === '"') inQuotes = false
      else current += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells
}

/**
 * CSV 또는 TSV 텍스트를 마크다운 테이블로 변환.
 * 유효한 CSV/TSV가 아니면 null 반환.
 */
export function csvTsvToMarkdownTable(text: string): string | null {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return null

  // 탭 구분자 시도
  const tabCounts = lines.map(l => l.split('\t').length)
  const isTab = tabCounts[0] > 1 && tabCounts.every(c => c === tabCounts[0])

  // 콤마 구분자 시도
  const commaCounts = lines.map(l => parseCsvLine(l, ',').length)
  const isCsv = !isTab && commaCounts[0] > 1 && commaCounts.every(c => c === commaCounts[0])

  if (!isTab && !isCsv) return null

  const delimiter = isTab ? '\t' : ','
  const rows = lines.map(l => parseCsvLine(l, delimiter).map(cell => cell.trim().replace(/\|/g, '\\|')))

  const header = rows[0]
  const separator = header.map(() => '---')
  const body = rows.slice(1)

  const formatRow = (cells: string[]) => '| ' + cells.join(' | ') + ' |'

  return [
    formatRow(header),
    formatRow(separator),
    ...body.map(formatRow),
  ].join('\n')
}
