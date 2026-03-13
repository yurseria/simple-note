import { create } from 'zustand'
import type { Settings } from '../../../types/settings'

interface SettingsStore {
  settings: Settings
  loaded: boolean
  load: () => Promise<void>
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  updateEditor: (patch: Partial<Settings['editor']>) => void
}

const defaultSettings: Settings = {
  general: { doubleEscToLeaveFullScreen: false },
  editor: {
    fontFamily: 'SF Mono',
    fontSize: 14,
    lineNumbersFontSize: 13,
    theme: 'dark',
    infoBarMode: 'hud',
    showLineNumbers: false,
    smartSubstitutions: false,
    spellingCheck: false,
    useSpacesForTabs: false,
    tabSize: 4,
    countWhitespacesInChars: false,
    keepIndentOnNewLines: true
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  loaded: false,

  load: async () => {
    const settings = await window.api.settings.get()
    set({ settings, loaded: true })

    window.api.settings.onChange((key, value) => {
      set((s) => ({ settings: { ...s.settings, [key]: value } }))
    })
  },

  update: (key, value) => {
    set((s) => ({ settings: { ...s.settings, [key]: value } }))
    window.api.settings.set(key, value)
  },

  updateEditor: (patch) => {
    const next = { ...get().settings.editor, ...patch }
    set((s) => ({ settings: { ...s.settings, editor: next } }))
    window.api.settings.set('editor', next)
  }
}))
