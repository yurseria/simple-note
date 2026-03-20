import { useEffect, useRef } from 'react'
import { useSettingsStore } from '../store/settingsStore'

interface Options {
  onNewTab: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onCloseTab: () => void
  onGotoLine: () => void
  onToggleMarkdownPreview: () => void
  onFind: () => void
  onReplace: () => void
}

export function useKeyboardShortcuts(opts: Options): void {
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey

      if (mod && !e.shiftKey && e.key === 't') {
        e.preventDefault()
        optsRef.current.onNewTab()
      } else if (mod && !e.shiftKey && e.key === 'o') {
        e.preventDefault()
        optsRef.current.onOpen()
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        optsRef.current.onSaveAs()
      } else if (mod && !e.shiftKey && e.key === 's') {
        e.preventDefault()
        optsRef.current.onSave()
      } else if (mod && !e.shiftKey && e.key === 'w') {
        e.preventDefault()
        optsRef.current.onCloseTab()
      } else if (mod && !e.shiftKey && e.key === 'g') {
        e.preventDefault()
        optsRef.current.onGotoLine()
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault()
        optsRef.current.onToggleMarkdownPreview()
      } else if (mod && !e.shiftKey && e.key === '=') {
        // Cmd/Ctrl+Plus (zoom in)
        e.preventDefault()
        const { updateEditor, settings } = useSettingsStore.getState()
        updateEditor({ fontSize: settings.editor.fontSize + 1 })
      } else if (mod && !e.shiftKey && e.key === '-') {
        // Cmd/Ctrl+Minus (zoom out)
        e.preventDefault()
        const { updateEditor, settings } = useSettingsStore.getState()
        updateEditor({ fontSize: Math.max(8, settings.editor.fontSize - 1) })
      } else if (mod && !e.shiftKey && e.key === '0') {
        // Cmd/Ctrl+0 (zoom reset)
        e.preventDefault()
        useSettingsStore.getState().updateEditor({ fontSize: 14 })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}
