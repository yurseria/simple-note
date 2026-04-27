'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { EditorView, keymap, drawSelection, highlightActiveLine, lineNumbers } from '@codemirror/view'
import { EditorState, EditorSelection, Compartment, Transaction } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history, insertTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting, defaultHighlightStyle, indentUnit } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'

const MONO_FONT = "'SF Mono', Menlo, Monaco, Consolas, 'Courier New', 'Nanum Gothic Coding', monospace"

// dark: oneDark handles background + syntax colors (#282c34 matches --editor-bg)
const darkOverride = EditorView.theme({
  '&': { height: '100%', color: '#abb2bf', fontFamily: MONO_FONT },
  '.cm-scroller': { overflow: 'auto', fontFamily: MONO_FONT },
  '.cm-line': { lineHeight: '1.7', padding: '0 16px' },
  '.cm-content': { fontFamily: MONO_FONT, color: '#abb2bf' },
  '.cm-gutters': { fontFamily: MONO_FONT },
}, { dark: true })

const lightTheme = EditorView.theme({
  '&': { height: '100%', background: '#fafafa', fontFamily: MONO_FONT },
  '.cm-scroller': { overflow: 'auto', fontFamily: MONO_FONT },
  '.cm-content': {
    fontFamily: MONO_FONT,
    caretColor: '#282c34',
    color: '#282c34',
  },
  '.cm-line': { lineHeight: '1.7', padding: '0 16px' },
  '.cm-gutters': { background: '#f3f3f3', borderRight: '1px solid #dde1e8', color: '#aaa', fontFamily: MONO_FONT },
  '.cm-activeLine': { background: 'rgba(0,0,0,0.035)' },
  '.cm-cursor': { borderLeftColor: '#282c34' },
  '.cm-selectionBackground': { background: 'rgba(64,120,242,0.18) !important' },
  '&.cm-focused .cm-selectionBackground': { background: 'rgba(64,120,242,0.25) !important' },
})

export interface Props {
  content: string
  onChange: (val: string) => void
  isMarkdown: boolean
  readOnly?: boolean
  theme: string
  editorRef: RefObject<EditorView | null>
}

export function CodeMirrorEditor({ content, onChange, isMarkdown, readOnly, theme, editorRef }: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const themeCompartment = useRef(new Compartment())
  const readOnlyCompartment = useRef(new Compartment())
  const lastContentRef = useRef(content)

  useEffect(() => {
    if (!containerRef.current) return

    const mdExts = isMarkdown
      ? [
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          keymap.of([
            { key: 'Mod-b', run: (v) => { wrapText(v, '**', '**'); return true }, preventDefault: true },
            { key: 'Mod-i', run: (v) => { wrapText(v, '*', '*'); return true }, preventDefault: true },
          ]),
        ]
      : []

    const view = new EditorView({
      state: EditorState.create({
        doc: content,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection({ cursorBlinkRate: 1200 }),
          EditorState.allowMultipleSelections.of(true),
          highlightActiveLine(),
          syntaxHighlighting(defaultHighlightStyle),
          EditorView.lineWrapping,
          indentUnit.of('  '),
          EditorView.contentAttributes.of({ spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' }),
          keymap.of([{ key: 'Tab', run: insertTab }, ...defaultKeymap, ...historyKeymap]),
          ...mdExts,
          themeCompartment.current.of(theme === 'dark' ? [oneDark, darkOverride] : lightTheme),
          readOnlyCompartment.current.of(EditorState.readOnly.of(!!readOnly)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !update.transactions.some((tr) => tr.annotation(Transaction.remote))) {
              lastContentRef.current = update.state.doc.toString()
              onChange(lastContentRef.current)
            }
          }),
        ],
      }),
      parent: containerRef.current,
    })

    editorRef.current = view
    lastContentRef.current = content

    return () => {
      view.destroy()
      editorRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMarkdown, theme])

  // External content change (e.g. file switch)
  useEffect(() => {
    const view = editorRef.current
    if (!view || lastContentRef.current === content) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
      annotations: Transaction.remote.of(true),
    })
    lastContentRef.current = content
  }, [content, editorRef])

  useEffect(() => {
    editorRef.current?.dispatch({
      effects: themeCompartment.current.reconfigure(theme === 'dark' ? [oneDark, darkOverride] : lightTheme),
    })
  }, [theme, editorRef])

  useEffect(() => {
    editorRef.current?.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(!!readOnly)),
    })
  }, [readOnly, editorRef])

  return <div ref={containerRef} className="cm-host" />
}

function wrapText(view: EditorView, prefix: string, suffix: string): void {
  const { state } = view
  const { from, to } = state.selection.main
  const selected = state.sliceDoc(from, to) || 'text'
  view.dispatch({
    changes: { from, to, insert: prefix + selected + suffix },
    selection: EditorSelection.range(from + prefix.length, from + prefix.length + selected.length),
  })
  view.focus()
}
