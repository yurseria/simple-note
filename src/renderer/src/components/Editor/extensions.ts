import {
  keymap,
  lineNumbers,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  Decoration,
  type DecorationSet,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  rectangularSelection,
  crosshairCursor
} from '@codemirror/view'
import { EditorState, EditorSelection, Compartment, Extension, Transaction, RangeSetBuilder } from '@codemirror/state'
import {
  history,
  defaultKeymap,
  historyKeymap,
  indentWithTab,
  insertTab,
  addCursorAbove,
  addCursorBelow
} from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import {
  searchKeymap,
  selectSelectionMatches,
  SearchCursor
} from '@codemirror/search'
import type { Command } from '@codemirror/view'
import { indentUnit, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import type { LanguageMode } from '../../../../types/tab'
import type { Settings } from '../../../../types/settings'

export interface EditorCompartments {
  language: Compartment
  lineNumbers: Compartment
  tabSize: Compartment
  theme: Compartment
}

export function createCompartments(): EditorCompartments {
  return {
    language: new Compartment(),
    lineNumbers: new Compartment(),
    tabSize: new Compartment(),
    theme: new Compartment()
  }
}

export function buildLanguageExt(language: LanguageMode): Extension {
  return language === 'markdown'
    ? markdown({ base: markdownLanguage, codeLanguages: languages })
    : []
}

export function buildLineNumbersExt(show: boolean): Extension {
  return show ? [lineNumbers(), highlightActiveLineGutter()] : []
}

export function buildTabExt(tabSize: number, useSpaces: boolean): Extension {
  const sizeExt = EditorState.tabSize.of(tabSize)
  const unitExt = indentUnit.of(useSpaces ? ' '.repeat(tabSize) : '\t')
  const tabKeymap = useSpaces
    ? keymap.of([{ key: 'Tab', run: insertTab }])
    : keymap.of([indentWithTab])
  return [sizeExt, unitExt, tabKeymap]
}

export function buildThemeExt(
  fontFamily: string,
  fontSize: number,
  lineNumbersFontSize: number
): Extension {
  // 한글 폰트 전략:
  //   1. 사용자 지정 폰트 (SF Mono 등 — ASCII 전용)
  //   2. ui-monospace / Menlo — macOS 시스템 모노스페이스 (ASCII)
  //   3. "Apple SD Gothic Neo" — macOS 기본 한글 (시스템 보장)
  //   4. monospace — 최후 fallback
  // D2Coding / Ligature NF 등 미설치 폰트를 체인에 넣으면
  // font metric 불일치로 한글 글자 baseline이 어긋나 "겹침"처럼 보일 수 있어 제거
  const fontStack = `"${fontFamily}", ui-monospace, Menlo, "Apple SD Gothic Neo", "Malgun Gothic", monospace`
  return EditorView.theme({
    '&': { fontSize: `${fontSize}px`, height: '100%' },
    '.cm-scroller': { overflow: 'auto', scrollbarColor: 'var(--border-color) var(--editor-bg)' },
    '.cm-content': {
      fontFamily: fontStack,
      caretColor: 'auto'
    },
    // line-height는 cm-line에 직접 지정 — 상위 요소 상속이 불안정함
    '.cm-line': {
      lineHeight: '1.6',
      padding: '0 16px'
    },
    '.cm-gutters': {
      fontFamily: fontStack,
      fontSize: `${lineNumbersFontSize}px`,
      lineHeight: '1.6'
    },
    '.cm-activeLineGutter': {
      lineHeight: '1.6'
    }
  })
}

// 내장 highlightSelectionMatches 대체 — ranges > 1에서도 동작
// 선택된 텍스트와 동일하지만 아직 선택 안 된 나머지 항목만 .cm-selectionMatch로 표시
// → Cmd+D로 하나씩 추가할 때도 미리보기 하이라이트가 유지됨
function buildRemainingMatchDecos(view: EditorView): DecorationSet {
  const { state } = view
  const { ranges } = state.selection
  const main = state.selection.main

  if (main.empty) return Decoration.none

  const queryText = state.sliceDoc(main.from, main.to)
  if (queryText.length < 1 || queryText.length > 200) return Decoration.none

  // 모든 비어있지 않은 range가 동일한 텍스트를 선택해야 함
  for (const r of ranges) {
    if (!r.empty && state.sliceDoc(r.from, r.to) !== queryText) return Decoration.none
  }

  const selectedSet = new Set(ranges.filter(r => !r.empty).map(r => `${r.from}:${r.to}`))
  const builder = new RangeSetBuilder<Decoration>()
  const mark = Decoration.mark({ class: 'cm-selectionMatch' })

  // 전체 문서 대신 현재 viewport 범위만 탐색해 부하 절감
  for (const { from: vFrom, to: vTo } of view.visibleRanges) {
    const cursor = new SearchCursor(state.doc, queryText, vFrom, vTo)
    while (!cursor.next().done) {
      const { from, to } = cursor.value
      if (!selectedSet.has(`${from}:${to}`)) {
        builder.add(from, to, mark)
      }
    }
  }

  return builder.finish()
}

const remainingMatchPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildRemainingMatchDecos(view)
    }
    update(u: ViewUpdate) {
      if (u.selectionSet || u.docChanged || u.viewportChanged) {
        this.decorations = buildRemainingMatchDecos(u.view)
      }
    }
  },
  { decorations: v => v.decorations }
)

// selectNextOccurrence 대체 — whole-word 매칭 없이 순수 substring 검색
// 기본 selectNextOccurrence는 선택이 완전한 단어일 때 word boundary 매칭으로 전환해
// "asd" → "asdasd" 안의 "asd"를 건너뜀. remainingMatchPlugin과 동일한 로직 사용.
const selectNextMatch: Command = (view) => {
  const { state } = view
  const { main, ranges } = state.selection

  if (main.empty) {
    const word = state.wordAt(main.head)
    if (!word) return false
    view.dispatch({ selection: EditorSelection.single(word.from, word.to), userEvent: 'select' })
    return true
  }

  const query = state.sliceDoc(main.from, main.to)
  if (!query) return false

  const selectedFromSet = new Set<number>()
  for (const r of ranges) {
    if (!r.empty && state.sliceDoc(r.from, r.to) === query) selectedFromSet.add(r.from)
  }
  const maxTo = ranges.reduce((m, r) => (r.to > m ? r.to : m), 0)

  const tryFind = (start: number, end?: number): { from: number; to: number } | null => {
    const cursor = new SearchCursor(state.doc, query, start, end)
    while (!cursor.next().done) {
      if (!selectedFromSet.has(cursor.value.from)) return cursor.value
    }
    return null
  }

  const found = tryFind(maxTo) ?? tryFind(0, maxTo)
  if (!found) return false

  view.dispatch({
    selection: EditorSelection.create([...ranges, EditorSelection.range(found.from, found.to)], ranges.length),
    userEvent: 'select',
    scrollIntoView: true
  })
  return true
}

export function buildBaseExtensions(
  onChange: (content: string) => void,
  compartments: EditorCompartments,
  settings: Settings['editor'],
  language: LanguageMode
): Extension[] {
  const multiEditKeymap = keymap.of([
    // 다음 동일 문자열 선택 (Cmd+D) — whole-word 매칭 없이 substring 검색
    { key: 'Mod-d', run: selectNextMatch, preventDefault: true },
    // 현재 선택 전체 발생 선택 (Cmd+Shift+L — VSCode 표준)
    { key: 'Mod-Shift-l', run: selectSelectionMatches, preventDefault: true },
    // 위/아래에 커서 추가 (⌥⌘↑ / ⌥⌘↓)
    { key: 'Alt-Mod-ArrowUp', run: addCursorAbove, preventDefault: true },
    { key: 'Alt-Mod-ArrowDown', run: addCursorBelow, preventDefault: true }
  ])

  return [
    history(),
    // drawSelection: 커스텀 커서/셀렉션 레이어 렌더링 (네이티브 selection 숨김)
    drawSelection({ cursorBlinkRate: 1200 }),
    // 이 버전의 CM6에서 drawSelection()이 allowMultipleSelections를 자동 활성화하지 않음 — 명시적 추가 필수
    EditorState.allowMultipleSelections.of(true),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    syntaxHighlighting(defaultHighlightStyle),
    // 선택 텍스트의 나머지 미선택 항목 하이라이트 (멀티커서 중에도 유지)
    remainingMatchPlugin,
    // Shift+Alt+Drag: 컬럼(박스) 선택
    rectangularSelection(),
    // Alt 누를 때 십자(+) 커서 표시
    crosshairCursor(),
    EditorView.lineWrapping,
    // IME(한글/CJK) 안정성: spellcheck/autocorrect 비활성화
    EditorView.contentAttributes.of({
      spellcheck: 'false',
      autocorrect: 'off',
      autocapitalize: 'off'
    }),
    // multi-edit 키맵을 defaultKeymap보다 앞에 배치해 우선순위 확보
    multiEditKeymap,
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
    EditorView.updateListener.of((update) => {
      // remote annotation이 붙은 트랜잭션(외부 sync dispatch)은 onChange 제외
      if (update.docChanged && !update.transactions.some((tr) => tr.annotation(Transaction.remote))) {
        onChange(update.state.doc.toString())
      }
    }),
    compartments.language.of(buildLanguageExt(language)),
    compartments.lineNumbers.of(buildLineNumbersExt(settings.showLineNumbers)),
    compartments.tabSize.of(buildTabExt(settings.tabSize, settings.useSpacesForTabs)),
    compartments.theme.of(buildThemeExt(settings.fontFamily, settings.fontSize, settings.lineNumbersFontSize))
  ]
}
